const express = require("express");
const cors = require("cors");

const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
// middleware
app.use(cors());
app.use(express.json());
console.log(process.env.DB_UserName, process.env.DB_Password);
const uri = `mongodb+srv://${process.env.DB_UserName}:${process.env.DB_Password}@cluster0.npnp02m.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//
async function run() {
  try {
    // collections

    const usersCollection = client.db("Foodo").collection("users");
    const menuCollection = client.db("Foodo").collection("menu");
    const bookingsCollection = client
      .db("Foodo")
      .collection("tableReservation");
    const paymentsCollection = client.db("Foodo").collection("payments");
    // Menu add, delete, get
    app.get("/menu", async (req, res) => {
      const query = {};
      const result = await menuCollection.find(query).toArray();
      res.send(result);
    });

    // User add, delete, make change of users
    app.get("/users", async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Get, add, delete Admin
    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });
  } finally {
  }
}
run().catch((err) => console.error(err));

app.get("/", async (req, res) => {
  res.send("Foodo!!! ");
});
app.listen(port, () => {
  console.log(`Foodo!! running on port: ${port}`);
});
