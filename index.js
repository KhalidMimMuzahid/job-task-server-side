const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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
    const users = client.db("programmingHeroJobTask").collection("users");
    const bills = client.db("programmingHeroJobTask").collection("bills");

    const getJWT = (email) => {
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });

      return token;
    };

    const verifyJWT = (req, res, next) => {
      if (!req.headers.authorization) {
        console.log("before step 1 , authorization is here");
        return res.status(401).send("unauthorised access");
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        function (err, decoded) {
          if (err) {
            return res.status(403).send("forbidden access");
          }
          req.decoded = decoded;
          next();
        }
      );
    };

    app.post("/registration", async (req, res) => {
      const userInfo = req.body;
      // console.log(userInfo);

      const query = { email: userInfo?.email };
      const options = {
        projection: { _id: 0, email: 1 },
      };
      const result = await users.findOne(query, options);
      if (result?.email) {
        return res.send({ error: "email-already-in-use" });
      }
      const result2 = await users.insertOne(userInfo);
      console.log("result2:", result2);
      if (result2?.acknowledged) {
        const token = getJWT(userInfo?.email);
        result2.token = token;
        return res.send(result2);
      } else {
        return res.send({ error: "something went wrong, please try again." });
      }
    });
    app.post("/login", async (req, res) => {
      const userInfo = req.body;
      // console.log(userInfo);
      const query = { email: userInfo.email };
      const result = await users.findOne(query);
      // console.log(result);
      if (!result) {
        return res.send({ error: "user-not-found" });
      } else if (result?.password !== userInfo?.password) {
        return res.send({ error: "wrong-password" });
      } else if (
        result?.email === userInfo?.email &&
        result?.password === userInfo?.password
      ) {
        const token = getJWT(userInfo?.email);
        const user = {
          name: result?.name,
          email: result?.email,
          _id: result?._id,
        };
        user.token = token;
        return res.send(user);
      }
    });
    app.get("/checkCurrentUser", async (req, res) => {
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        async function (err, decoded) {
          if (err) {
            return res.status(403).send("forbidden access");
          } else if (decoded?.email) {
            const query = { email: decoded?.email };
            const options = {
              projection: { email: 1, name: 1 },
            };
            const result = await users.findOne(query, options);
            if (result) {
              // authorityEmail:
              const query = { authorityEmail: decoded?.email };
              const options = {
                sort: { date: -1 },
              };
              const cursor = bills.find(query, options);
              const allBills = await cursor?.toArray();
              // console.log(allBills);
              const paidTotal = allBills.reduce(
                (acc, curr) => acc + curr?.amount,
                0
              );
              // console.log("paidTotal:", paidTotal);
              const allBillsInfo = {
                currentUser: result,
                paidTotal: paidTotal,
              };
              return res.send(allBillsInfo);
            } else {
              return res.status(403).send("forbidden access");
            }
          } else {
            return res.status(403).send("forbidden access");
          }
        }
      );
    });
    app.post("/add-billing", verifyJWT, async (req, res) => {
      if (req?.decoded?.email !== req?.body?.bill?.authorityEmail) {
        return res.status(401).send("unauthorised access");
      }
      const bill = req?.body?.bill;
      // console.log(req?.decoded);
      // console.log("data:", req.body);
      // console.log("bill:", bill);

      const result = await bills.insertOne(bill);
      // console.log(result);
      res.send(result);
    });
    app.get("/billing-list", verifyJWT, async (req, res) => {
      const {
        pageNo: pageNoString,
        size: sizeString,
        searchKey,
        searchType: searchTypeString,
      } = req.query;
      // console.log("searchKey: ", searchKey, "searchType: ", searchType);

      const pageNo = parseInt(pageNoString);
      const size = parseInt(sizeString);
      // console.log(pageNo, size);
      const authorityEmail = req?.decoded?.email;
      // authorityEmail:
      let query = {};
      if (searchKey && searchTypeString) {
        if (searchTypeString === "name") {
          query = { authorityEmail, name: searchKey };
        } else if (searchTypeString === "email") {
          query = { authorityEmail, email: searchKey };
        } else if (searchTypeString === "phone") {
          query = { authorityEmail, phone: searchKey };
        }
      } else {
        query = { authorityEmail };
      }
      const options = {
        sort: { date: -1 },
      };
      const cursor = bills.find(query, options);
      const allBills = await cursor?.toArray();
      const totalBills = allBills?.length;

      // console.log("totalBills: ", totalBills);
      const cursor2 = bills.find(query, options);
      const result = await cursor2
        .skip(pageNo * size)
        .limit(size)
        .toArray();
      // console.log("result: ", result);
      const billsInfo = {};
      billsInfo.bills = result;
      billsInfo.totalBills = totalBills;
      res.send(billsInfo);
    });
    app.delete("/delete-billing/:id", verifyJWT, async (req, res) => {
      const _id = req?.params?.id;
      // console.log(_id);

      const query = { _id: ObjectId(_id) };
      const result = await bills.deleteOne(query);
      res.send(result);
    });
    app.put("/update-billing/:id", verifyJWT, async (req, res) => {
      const updateBillInfo = req?.body;
      console.log("updateBillInfo:", updateBillInfo);
      const _id = req?.params?.id;
      console.log("_id:", _id);

      const filter = { _id: ObjectId(_id) };
      const options = { upsert: true };

      const updateDoc = {
        $set: { ...updateBillInfo },
      };
      const result = await bills.updateOne(filter, updateDoc, options);
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
