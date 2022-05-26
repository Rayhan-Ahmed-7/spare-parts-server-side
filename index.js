const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

//middleware
app.use(cors());
app.use(express.json());

//jwt verification
const verifyJwt = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = header.split(' ')[1];
    jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
        if (err) {
            res.status(403).send({ message: 'forbidden access' });
        } else {
            req.decoded = decoded;
            next();
        }
    })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wkgcv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect()
        const carPartsCollection = client.db("spare-parts").collection("car-parts");
        const reviewCollection = client.db("spare-parts").collection("reviews");
        const userCollection = client.db("spare-parts").collection("users");
        const orderCollection = client.db("spare-parts").collection("orders");
        const paymentCollection = client.db("spare-parts").collection("payments");
        //console.log('db connected');
        //stripe payment intent
        //admin verification
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            } else {
                res.status(403).send({ message: 'forbidden' });
            }
        }
        app.post('/create-payment-intent', verifyJwt, async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        })
        app.get('/car-parts', async (req, res) => {
            const result = await carPartsCollection.find({}).toArray();
            res.send(result);
        })
        app.post('/car-parts',verifyJwt,verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await carPartsCollection.insertOne(product);
            res.send(result);
        })
        //single car-part
        app.get('/car-parts/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await carPartsCollection.findOne(query);
            res.send(result);
        })
        //delete spare parts
        app.delete('/car-parts/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await carPartsCollection.deleteOne(query);
            res.send(result);
        })
        // creating user
        app.put('/user', async (req, res) => {
            const user = req.body;
            const email = user?.email;
            //console.log(user);
            const filter = { email };
            const options = { upsert: true };
            const updateDoc = {
                $set: { user }
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email }, process.env.SECRET_KEY, {
                expiresIn: '1d'
            })
            res.send({ result, token });
        })
        //get all user 
        app.get('/users',verifyJwt,verifyAdmin,async(req,res)=>{
            const users = await userCollection.find().toArray();
            res.send(users);
        })
        
        //get user 
        app.get('/user/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const result = await userCollection.findOne(query);
            res.send(result);
        })
        //check user admin or not
        app.get('/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await userCollection.findOne(query);
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        })
        //make user a admin
        app.put('/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const filter = { email };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const user = await userCollection.updateOne(filter, updateDoc);
            //const isAdmin = user.role === 'admin';
            res.send(user);
        })
        // updating user
        app.put('/user/:email', async (req, res) => {
            const user = req.body;
            const email = req.params.email;
            const filter = { email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    education: user.education,
                    location: user.location,
                    phone: user.phone,
                    linkedIn: user.linkedIn
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })
        //orders
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })
        //get user order
        app.get('/orders/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        })
        //get single user order
        app.get('/order/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        })
        //update order
        app.patch('/order/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await orderCollection.updateOne(filter, updateDoc);
            res.send(updateDoc);
        })
        //delete user order
        app.delete('/orders/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })
        //get all orders
        app.get('/orders', verifyJwt, verifyAdmin, async (req, res) => {
            const result = await orderCollection.find().toArray();
            res.send(result);
        })
        // update order status
        app.put('/order/:id',verifyJwt,verifyAdmin,async(req,res)=>{
            const id = req.params.id;
            const filter = {_id:ObjectId(id)};
            const updateDoc = {
                $set:{
                    status:"shipped"
                }
            }
            const result = await orderCollection.updateOne(filter,updateDoc);
            res.send(result);
        })
        //reviews api
        app.get('/reviews', async (req, res) => {
            const query = {};
            const result = await reviewCollection.find(query).toArray();
            res.send(result);
        })
        //add a review
        app.post('/reviews', verifyJwt, async (req, res) => {
            const review = req.body;
            console.log(review)
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })

    }
    finally {
        //await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("wellcom to spare parts.!");
})

app.listen(port, () => {
    console.log("listening to ", port);
})