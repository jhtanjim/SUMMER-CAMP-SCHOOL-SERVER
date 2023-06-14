const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5000
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
//middleware
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.khwex9e.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const classCollection = client.db("campDb").collection("class")
        const cartCollection = client.db("campDb").collection("carts");
        const userCollection = client.db("campDb").collection("users");

        const paymentCollection = client.db("campDb").collection("payments");




        // for class

        app.get('/class', async (req, res) => {
            const result = await classCollection.find().toArray()
            res.send(result)
        })


        app.post('/class', async (req, res) => {
            const newClass = req.body
            const result = await classCollection.insertOne(newClass)
            res.send(result)

        })

        app.patch('/class/approved/:id', async (req, res) => {

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
        app.patch('/class/deny/:id', async (req, res) => {
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




        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })



        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            console.log('existingUser:', existingUser);
            if (existingUser) {
                return res.send({ message: 'User Already Exist' })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })




        //check instuctor
        app.get('/users/instuctor/:email', async (req, res) => {
            const email = req.params.email

            const query = { email: email }
            const user = await userCollection.findOne(query)
            const result = { instuctor: user?.role === 'instuctor' }
            res.send(result)
        })


        // instuctor bananor jnnw

        app.patch('/users/instuctor/:id', async (req, res) => {

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
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })

        // admin bananor jnnw

        app.patch('/users/admin/:id', async (req, res) => {

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


        app.get('/carts', async (req, res) => {
            const email = req.query.email
            // console.log(email);
            if (!email) {
                res.send([])
            }
            const query = { email: email }
            const result = await cartCollection.find(query).toArray()
            res.send(result)
        })




        app.post('/carts', async (req, res) => {
            const item = req.body;
            console.log(item);
            const result = await cartCollection.insertOne(item)
            res.send(result)
        })

        // for delete
        app.delete('/carts/:id', async (req, res) => {

            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result)

        })

        //safaw
        // create payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
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
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const insertedResult = await paymentCollection.insertOne(payment);
            const query = { _id: { $in: payment.classItems.map(id => new ObjectId(id)) } }
            const deleteResult = await cartCollection.deleteOne(query)

            res.send({ insertedResult, deleteResult });
        })

        app.get('/payments', async (req, res) => {
            const result = await paymentCollection.find().toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db('admin').command({ ping: 1 });
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
