const express = require("express");
const cors = require("cors");

const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();


const SSLCommerzPayment = require('sslcommerz-lts')
const store_id = process.env.Store_ID;
const store_passwd = process.env.Store_Password;
// console.log(store_id, store_passwd);
const is_live = false //true for live, false for sandbox

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

// Function to get the start of the current and last month
function getStartOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getStartOfLastMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}
function getStartOfDay(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

function getEndOfDay(date) {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

function getStartOfYesterday(date) {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return getStartOfDay(yesterday);
}

function getEndOfYesterday(date) {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return getEndOfDay(yesterday);
}
//
async function run() {
  try {
    // collections

    const usersCollection = client.db("Foodo").collection("users");
    const menuCollection = client.db("Foodo").collection("menu");
    const orderCollection = client.db("Foodo").collection("order");
    const tableReserveCollection = client
      .db("Foodo")
      .collection("tableReservation");
    const paymentsCollection = client.db("Foodo").collection("payments");

    // Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      // console.log(decodedEmail);
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // Verify Staff
    const verifyStaff = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "staff") {
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
    app.get("/menu/limit", async (req, res) => {
      const query = {};
      const result = await menuCollection.find(query).limit(6).toArray();
      res.send(result);
    });
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.findOne(query);
      res.send(result);
    });
    app.get("/menu", async (req, res) => {
      const query = {};
      const result = await menuCollection.find(query).toArray();
      res.send(result);
    });
    //add menu by admin
    app.post("/menu/admin", async (req, res) => {
      const query = req.body;
      const product = await menuCollection.insertOne(query);
      res.send(product);
    });

    //add menu by staff
    app.post("/menu/staff", async (req, res) => {
      const query = req.body;
      const product = await menuCollection.insertOne(query);
      res.send(product);
    });
    // delete menu
    app.delete("/menu/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
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

    // Get, add, delete Admin. All kind of Admin role
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    //make admin
    app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      // console.log(filter);
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
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
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
      const query = { role: role };
      const Staff = await usersCollection.find(query).toArray();
      res.send(Staff);
    });
    // delete staff
    app.delete("/staff/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // get all  admin
    app.get("/admin", verifyJWT, verifyAdmin, async (req, res) => {
      const role = "admin";
      const query = { role: role };
      const Staff = await usersCollection.find(query).toArray();
      res.send(Staff);
    });

    // all kind of a staff role
    app.get("/users/staff/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const query = { email };
      const user = await usersCollection.findOne(query);
      // console.log(user.role);
      res.send({ isStaff: user?.role === "staff" });
    });

    // Orders
    app.post("/orders", async (req, res) => {
      const query = req.body;
      const result = await orderCollection.insertOne(query);
      res.send(result);
    });
    // Orders with payment
    app.post("/orders-payment", async (req, res) => {
      const order = req.body;


      const result = order.items.join(', ');
      // console.log(result);

      const transactionId = new ObjectId().toString();
      const data = {
        total_amount: order.totalPrice,
        currency: 'BDT',
        tran_id: transactionId, // use unique tran_id for each api call
        success_url: `https://foodo-server.vercel.app/payment/success?transactionId=${transactionId}`,
        fail_url: `https://foodo-server.vercel.app/payment/fail?transactionId=${transactionId}`,
        cancel_url: `https://foodo-server.vercel.app/payment/cancel`,
        ipn_url: 'https://foodo-server.vercel.app/ipn',
        product_name: result,
        product_category: 'Food',
        product_profile: 'general',
        cus_name: order.userName,
        cus_email: order.orderEmail,
        cus_add1: order.location,
        shipping_method: 'No',
        cus_country: 'Bangladesh',
        cus_phone: order.phoneNumber,

      };

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL
        orderCollection.insertOne({ ...order, transactionId, payStatus: 'unpaid', });
        res.send({ url: GatewayPageURL });
        console.log(' : ', apiResponse)
      });

      // const result = await orderCollection.insertOne(query);
      // res.send(result);
    });

    app.post("/payment/success", async (req, res) => {
      const { transactionId } = req.query;

      if (!transactionId) {
        return res.redirect(`https://rms-foodo.web.app/dashboard/my-orders`);
      }

      const result = await orderCollection.updateOne(
        { transactionId },
        { $set: { payStatus: 'paid', paidAt: new Date() } }
      );

      if (result.modifiedCount > 0) {
        res.redirect(`https://rms-foodo.web.app/dashboard/my-orders`);
      }
    });

    app.post("/payment/fail", async (req, res) => {
      const { transactionId } = req.query;
      if (!transactionId) {
        return res.redirect(`https://rms-foodo.web.app/dashboard/my-orders`);
      }
      const result = await orderCollection.deleteOne({ transactionId });
      if (result.deletedCount) {
        res.redirect(`https://rms-foodo.web.app/dashboard/my-orders`);
      }
    });



    app.get("/total-sell", verifyJWT, verifyAdmin, async (req, res) => {
      const option = req.query.option;

      const currentDate = new Date();

      const startOfToday = new Date(currentDate);
      startOfToday.setHours(0, 0, 0, 0);

      const startOfCurrentMonth = getStartOfMonth(currentDate).toISOString();

      const startOfLastMonth = getStartOfLastMonth(currentDate).toISOString();

      const startOfYesterday = getStartOfYesterday(currentDate).toISOString();
      const endOfYesterday = getEndOfYesterday(currentDate).toISOString();

      // Find orders for today
      const ordersToday = await orderCollection.find({
        $and: [{ orderDate: { $gte: startOfToday.toISOString(), $lte: currentDate.toISOString() } }, { payStatus: "paid" }]
      }).toArray();

      // Find orders for this month
      const ordersThisMonth = await orderCollection.find({
        $and: [{ orderDate: { $gte: startOfCurrentMonth, $lte: currentDate.toISOString() } }, { payStatus: "paid" }]
      }).toArray();

      // Find orders for last month
      const ordersLastMonth = await orderCollection.find({
        $and: [{ orderDate: { $gte: startOfLastMonth, $lte: startOfCurrentMonth } }, { payStatus: "paid" }]
      }).toArray();

      const ordersYesterdayPaid = await orderCollection.find({
        $and: [
          { orderDate: { $gte: startOfYesterday, $lte: endOfYesterday } },
          { payStatus: "paid" }
        ]
      }).toArray();

      if (option === 'Today') {
        res.send(ordersToday);
      }
      if (option === 'Yesterday') {
        res.send(ordersYesterdayPaid);
      }
      if (option === "This Month") {
        res.send(ordersThisMonth)
      }
      if (option === "Last Month") {
        res.send(ordersLastMonth)
        // console.log(option, "Last Month");
      }
    });

    //get order for admin
    app.get("/orders", verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });
    //get order for admin
    app.get("/orders-for-staff", verifyJWT, verifyStaff, async (req, res) => {
      const query = {};
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });
    // user oder
    app.get("/my-order", verifyJWT, async (req, res) => {
      const email = req.query.email;
      // console.log(req.query);
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send("Forbidden Access Request");
      }
      const query = { userEmail: email };
      const product = await orderCollection.find(query).toArray();
      res.send(product);
    });

    // paid
    app.put("/paid/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          payStatus: "paid",
        },
      };
      const result = await orderCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    // served
    app.put("/serve/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          serveStatus: "served",
        },
      };
      const result = await orderCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //Table Reservation
    app.post("/table-reservation", async (req, res) => {
      const query = req.body;
      const result = await tableReserveCollection.insertOne(query);
      res.send(result);
    });
    // user table reservation
    app.get("/my-table-reservation", verifyJWT, async (req, res) => {
      const email = req.query.email;
      console.log(req.query);
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send("Forbidden Access Request");
      }
      const query = { email: email };
      const result = await tableReserveCollection.find(query).toArray();
      res.send(result);
    });
    //get table reservation for admin
    app.get(
      "/table-reservation-for-admin",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const query = {};
        const result = await tableReserveCollection.find(query).toArray();
        res.send(result);
      }
    );
    //get order for admin
    app.get(
      "/table-reservation-for-staff",
      verifyJWT,
      verifyStaff,
      async (req, res) => {
        const query = {};
        const result = await tableReserveCollection.find(query).toArray();
        res.send(result);
      }
    );
    // finished
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
