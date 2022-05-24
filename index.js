const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();

//middleware
app.use(cors());
app.use(express.json());

const verifyJwt = async (req,res,next) => {
    const header = req.headers.authorization;
    if(!header){
        return res.status(401).send({message:'unauthorized access'});
    }
    const token = header.split(' ')[1];
    jwt.verify(token,process.env.SECRET_KEY,function (err,decoded){
        if(err){
            res.status(403).send({message:'forbidden access'});
        }else{
            req.decoded = decoded;
            next();
        }
    })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wkgcv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect()
        const carPartsCollection = client.db("spare-parts").collection("car-parts");
        const userCollection = client.db("spare-parts").collection("users");
        //console.log('db connected');
        app.get('/car-parts',verifyJwt,async(req,res)=>{
            const result = await carPartsCollection.find({}).toArray();
            res.send(result);
        })
        //single car-part
        app.get('/car-parts/:id',verifyJwt,async(req,res)=>{
            const id = req.params.id;
            const query = {_id:ObjectId(id)};
            const result = await carPartsCollection.findOne(query);
            res.send(result);
        })
        //user
        app.put('/user',async(req,res)=>{
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
                expiresIn: '12h'
            })
            res.send({ result, token });
        })
    }
    finally{
        //await client.close();
    }
}
run().catch(console.dir);

app.get('/',(req,res)=>{
    res.send("wellcom to spare parts.!");
})

app.listen(port,()=>{
    console.log("listening to ",port);
})