import Counter from "../models/Counter.js";

export default async function getNextSequence(name) {
  const result = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true, // create the document if it doesn't exist
    }
  );

  return result.seq;
}
