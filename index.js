const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5000
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const admin = require('firebase-admin');
//middleware
app.use(cors())
app.use(express.json())

// only project id is needed to check firebase id tokens
admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'summer-camp-school-8c232'
})

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.khwex9e.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const classCollection = client.db("campDb").collection("class")
const cartCollection = client.db("campDb").collection("carts");
const userCollection = client.db("campDb").collection("users");
const paymentCollection = client.db("campDb").collection("payments");


// check the token firebase gave to the logged in user
const verifyToken = async (req, res, next) => {
    const authorization = req.headers.authorization
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1]
    try {
        const decoded = await admin.auth().verifyIdToken(token)
        req.decoded = decoded
        next()
    } catch (error) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
}

// use after verifyToken
const verifyAdmin = async (req, res, next) => {
    const user = await userCollection.findOne({ email: req.decoded.email })
    if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden access' })
    }
    next()
}

// admin can also do instructor work
const verifyInstructor = async (req, res, next) => {
    const user = await userCollection.findOne({ email: req.decoded.email })
    if (user?.role !== 'instuctor' && user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden access' })
    }
    next()
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        // for class

        app.get('/class', async (req, res) => {
            const result = await classCollection.find().toArray()
            res.send(result)
        })


        app.post('/class', verifyToken, verifyInstructor, async (req, res) => {
            const newClass = {
                ...req.body,
                email: req.decoded.email,
                statusbar: 'pending'
            }
            const result = await classCollection.insertOne(newClass)
            res.send(result)

        })

        app.patch('/class/approved/:id', verifyToken, verifyAdmin, async (req, res) => {

            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    statusbar: 'approved'
                }
            }
            const result = await classCollection.updateOne(filter, updateDoc)
            res.send(result)

        })
        app.patch('/class/deny/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const { feedback } = req.body;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    statusbar: 'deny',
                    feedback: feedback
                }
            };

            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);
        });




        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        // public list for instructors page
        app.get('/instructors', async (req, res) => {
            const query = { role: 'instuctor' }
            const options = { projection: { name: 1, email: 1, image: 1, role: 1 } }
            const result = await userCollection.find(query, options).toArray()
            res.send(result)
        })



        app.post('/users', verifyToken, async (req, res) => {
            // role is never taken from body, admin gives it
            const user = {
                name: req.body.name,
                email: req.decoded.email,
                image: req.body.image
            };
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'User Already Exist' })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })




        //check instuctor
        app.get('/users/instuctor/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            if (req.decoded.email !== email) {
                return res.send({ instuctor: false })
            }

            const query = { email: email }
            const user = await userCollection.findOne(query)
            const result = { instuctor: user?.role === 'instuctor' }
            res.send(result)
        })


        // instuctor bananor jnnw

        app.patch('/users/instuctor/:id', verifyToken, verifyAdmin, async (req, res) => {

            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'instuctor'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)

        })




        //check admin
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            if (req.decoded.email !== email) {
                return res.send({ admin: false })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })

        // admin

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {

            const id = req.params.id
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)

        })

        // for cart collection apis


        app.get('/carts', verifyToken, async (req, res) => {
            const email = req.query.email
            if (!email) {
                return res.send([])
            }
            if (req.decoded.email !== email) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            const query = { email: email }
            const result = await cartCollection.find(query).toArray()
            res.send(result)
        })




        app.post('/carts', verifyToken, async (req, res) => {
            const item = { ...req.body, email: req.decoded.email };
            // same class should not go in cart twice
            const alreadyAdded = await cartCollection.findOne({ email: item.email, classItem: item.classItem })
            if (alreadyAdded) {
                return res.send({ message: 'Class already selected' })
            }
            const result = await cartCollection.insertOne(item)
            res.send(result)
        })

        // for delete
        app.delete('/carts/:id', verifyToken, async (req, res) => {

            const id = req.params.id
            // user can delete only own cart item
            const query = { _id: new ObjectId(id), email: req.decoded.email }
            const result = await cartCollection.deleteOne(query)
            res.send(result)

        })


        // create payment intent
        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const { price } = req.body;
            const amount = Math.round(parseFloat(price) * 100);
            if (!amount || amount < 1) {
                return res.status(400).send({ message: 'Invalid price' })
            }
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })


        // payment related api
        app.post('/payments', verifyToken, async (req, res) => {
            const payment = { ...req.body, email: req.decoded.email };
            const insertedResult = await paymentCollection.insertOne(payment);
            const query = { _id: { $in: payment.classItems.map(id => new ObjectId(id)) }, email: payment.email }
            const deleteResult = await cartCollection.deleteMany(query)

            // one seat less for the class, one more student
            if (payment.classId) {
                await classCollection.updateOne(
                    { _id: new ObjectId(payment.classId) },
                    { $inc: { seat: -1, enrolled: 1 } }
                )
            }

            res.send({ insertedId: insertedResult.insertedId, insertedResult, deleteResult });
        })

        // logged in user gets only own payments
        app.get('/payments', verifyToken, async (req, res) => {
            const query = { email: req.decoded.email }
            const result = await paymentCollection.find(query).toArray()
            res.send(result)
        })

        // public, only class names for student count
        app.get('/payments/counts', async (req, res) => {
            const options = { projection: { _id: 0, itemNames: 1 } }
            const result = await paymentCollection.find({}, options).toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        // await client.db('admin').command({ ping: 1 });
        console.log('Pinged your deployment. You successfully connected to MongoDB!');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);



app.get('/', (req, res) => {
    res.send(" Music school is running")
})

app.listen(port, () => {
    console.log(`Music is singing port on ${port}`);
})
