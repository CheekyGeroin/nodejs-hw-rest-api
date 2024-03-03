const { Schema, model } = require("mongoose");
const { handleMongooseError } = require("../middlewares");

const emailRegexp = /^\w+([\.-]?w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

const userSchema = new Schema({
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    match: emailRegexp,
    unique: true,
  },
  subscription: {
    type: String,
    enum: ["starter", "pro", "business"],
    default: "starter",
  },
  token: {
    type: String,
    default: null,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "user",
  },
});
userSchema.post("save", handleMongooseError);

const User = model("user", userSchema);

module.exports = User;
