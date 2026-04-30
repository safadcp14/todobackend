const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const cors = require("cors");

const app = express()
app.use(express.json())

const allowedOrigins = [
  "https://todofrontend-kohl.vercel.app"
];

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser tools (curl/postman) with no Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS blocked for this origin"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('/{*any}', cors(corsOptions));

// 🔌 MongoDB connection
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/authDB';

mongoose.connect(MONGODB_URI)
.then(() => console.log('Mongo connected'))
.catch(err => console.log(err))

// 👤 User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
})
const todoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  done: { type: Boolean, default: false }
});

const Todo = mongoose.model('Todo', todoSchema);

const User = mongoose.model('User', userSchema)


// 📝 Register
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ msg: 'Missing fields' })
        }

        const existing = await User.findOne({ email })
        if (existing) {
            return res.status(400).json({ msg: 'User already exists' })
        }

        const hashed = await bcrypt.hash(password, 10)

        const user = new User({
            email,
            password: hashed
        })

        await user.save()

        res.json({ msg: 'User registered' })

    } catch (err) {
        res.status(500).json({ msg: 'Error', err })
    }
})

app.post('/todos', async (req, res) => {
  try {
    const { email, text } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User not found' });

    const todo = new Todo({
      userId: user._id,
      text
    });

    await todo.save();
    res.json(todo);

  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
});

app.get('/todos/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(400).json({ msg: 'User not found' });

    const todos = await Todo.find({ userId: user._id });

    res.json(todos);

  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
});


app.put('/todos/:id', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

    todo.done = !todo.done;
    await todo.save();

    res.json(todo);
  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
});


app.delete('/todos/:id', async (req, res) => {
  try {
    await Todo.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Error' });
  }
});

app.get("/", (req, res) => {
  res.json({ msg: "Backend is running" });
});
// 🔐 Login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({ msg: 'User not found' })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid password' })
        }

        res.json({ msg: 'Login success' })

    } catch (err) {
        res.status(500).json({ msg: 'Error', err })
    }
})

app.use((err, req, res, next) => {
  if (err && err.message === "CORS blocked for this origin") {
    return res.status(403).json({ msg: err.message });
  }
  return next(err);
});


// 🚀 Server
app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`)
})