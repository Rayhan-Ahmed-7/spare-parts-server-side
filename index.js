const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();

//middleware
app.use(cors());
app.use(express.json());

const verifyJwt = async (req,res,next) => {

}

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wkgcv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect()
        const carPartsCollection = client.db("spare-parts").collection("car-parts");
        //console.log('db connected');
        app.get('/car-parts',async(req,res)=>{
            const result = await carPartsCollection.find({}).toArray();
            res.send(result);
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