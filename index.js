const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 9000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.k0fejmd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const ItemCollection = client.db("SnakeEye").collection("ProductCollection");
const blogsCollection = client.db("SnakeEye").collection("blogsCollection");
const userCollection = client.db("SnakeEye").collection("userCollection");
const commentCollection = client.db("SnakeEye").collection("commentCollection");
const cartCollection = client.db("SnakeEye").collection("cartCollection");

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.Access_Token, (error, decoded) => {
    if (error) {
      return res
        .status(403)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const filter = { email: email };
      const user = await userCollection.findOne(filter); //* Find where we put the user
      if (user?.role !== "admin") {
        res.status(403).send({ error: true, message: "forbidden message" });
        next();
      }
    };

    // jwt

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.Access_Token, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // product route

    app.get("/product", async (req, res) => {
      const result = await ItemCollection.find().toArray();
      res.send(result);
    });

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await ItemCollection.findOne(filter);
      res.send(result);
    });

    app.post("/product", async (req, res) => {
      const item = req.body;
      const result = await ItemCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await ItemCollection.deleteOne(filter);
      res.send(result);
    });

    // blog route

    app.get("/blogs", async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result);
    });

    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(filter);
      res.send(result);
    });

    // user route

    app.get("/user", verifyJWT, verifyAdmin,async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/user", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return existingUser;
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/user/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/user/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(filter);
      res.send(result);
    });

    // comment route

    app.get("/comment", async (req, res) => {
      const result = await commentCollection.find().toArray();
      res.send(result);
    });

    app.post("/comment", async (req, res) => {
      const comment = req.body;
      const result = await commentCollection.insertOne(comment);
      res.send(result);
    });

    // cart route

    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      //email validation
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "access forbidden" });
      }

      const filter = { email: email };
      const result = await cartCollection.find(filter).toArray();
      res.send(result);
    });

    // * Admin Check

    app.get("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const filter = { email: email };
      const user = await userCollection.findOne(filter);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const cart = req.body;
      const result = await cartCollection.insertOne(cart);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(filter);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server Information Coming Soon");
});

app.listen(port, () => {
  console.log(`My Backend Server Listen On ${port}`);
});
