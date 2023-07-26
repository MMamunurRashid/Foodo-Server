const express = require("express");
const cors = require("cors");

const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
// middleware
app.use(cors());
app.use(express.json());
// console.log(process.env.DB_UserName, process.env.DB_Password);
const uri = `mongodb+srv://${process.env.DB_UserName}:${process.env.DB_Password}@cluster0.npnp02m.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  // console.log(authHeader);
  if (!authHeader) {
    return res.status(401).send("Unauthorized Access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access Request" });
    }
    req.decoded = decoded;
    next();
  });
}

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

    // Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      console.log(decodedEmail);
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //jwt
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      // console.log(user);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "Forbidden Access" });
    });

    // Menu add, delete, get
    app.get("/menu", async (req, res) => {
      const query = {};
      const result = await menuCollection.find(query).toArray();
      res.send(result);
    });

    // User add, delete, make change of users
    app.put("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", verifyJWT, async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    // Get, add, delete Admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    //make admin
    app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // make staff
    app.put("/users/staff/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "staff",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //get staff from admin panel
    app.get("/staff", verifyJWT, verifyAdmin, async (req, res) => {
      const role = "staff";
      const query = { option: option };
      const Staff = await usersCollection.find(query).toArray();
      res.send(Staff);
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
