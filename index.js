const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5000
require('dotenv').config()

//middleware
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.khwex9e.mongodb.net/?retryWrites=true&w=majority`;


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
        // ========================================================================
        // database collection
        const classCollection = client.db("campDb").collection("class")
        const instuctorCollection = client.db("campDb").collection("instuctor")
        const cartCollection = client.db("campDb").collection("carts");




        // -------------------------

        // -----------------
        // for menu


        app.get('/class', async (req, res) => {
            const result = await classCollection.find().toArray()
            res.send(result)
        })













        // for instuctor


        app.get('/instuctor', async (req, res) => {
            const result = await instuctorCollection.find().toArray()
            res.send(result)
        })



        // for cart collection apis
        app.post('/carts', async (req, res) => {
            const item = req.body;
            console.log(item);
            const result = await cartCollection.insertOne(item)
            res.send(result)
        })


        //--------











        // ========================================================================








        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
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