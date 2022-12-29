const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.port || 5003;
app.use(cors());
app.use(express.json());
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const uri = `mongodb+srv://${user}:${password}@cluster0.ejj8xud.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
// testing purpose
app.get("/", async (req, res) => {
  res.send({ message: "hello world" });
});
async function run() {
  try {
    const inputFormsInfoDatabase = client
      .db("jobTask01")
      .collection("inputFormsInfo");

    // for job task 01
    // insert inputform info to database
    app.post("/inputformsfnfo", async (req, res) => {
      const inputFormsInfo = req.body;
      console.log(inputFormsInfo);
      const result = await inputFormsInfoDatabase.insertOne(inputFormsInfo);
      res.send(result);
    });
    // update information into database
    app.put("/updateinputformsfnfo", async (req, res) => {
      const inputFormsInfo = req.body;
      const _id = req?.query?._id;
      console.log("_id =", _id);
      console.log(inputFormsInfo);
      const filter = { _id: ObjectId(_id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: inputFormsInfo,
      };
      const result = await inputFormsInfoDatabase.updateOne(
        filter,
        updateDoc,
        options
      );
      console.log(result);
      res.send(result);
    });
    // get inputform info  from database
    app.get("/inputformsfnfo", async (req, res) => {
      const result = await inputFormsInfoDatabase.find().toArray();
      console.log(result);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.log());

app.listen(port, () => {
  console.log("listening on port", port);
});
