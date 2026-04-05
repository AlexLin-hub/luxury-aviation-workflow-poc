import fastify, { type FastifyInstance } from "fastify";
import Type from "typebox"
import Value from "typebox/value";

const server = fastify();
const bookingSchema = Type.Object({
    name: Type.String(),
    email: Type.String({ format: "email" }),
});

type Booking = Type.Static<typeof bookingSchema>;

function validateBooking(body: Booking): boolean {
    return Value.Check(bookingSchema, body)
}

function handleBooking(fastify: FastifyInstance) {
    fastify.post("/booking", async (request, reply) => {
        const body = request.body as Booking;
        const isVaild = validateBooking(body)
        console.log({ isVaild, body });
        if (isVaild) reply.status(200).send({ message: "Booking received" });
        else reply.status(400).send({ message: "Booking failed." });
    });
}

server.register(handleBooking, { prefix: "/api/webhook" });

server.listen({ port: 3000 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
});