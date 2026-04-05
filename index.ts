import fastify, { type FastifyInstance } from "fastify";
import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "typebox"

const server = fastify().withTypeProvider<TypeBoxTypeProvider>();
const bookingSchema = Type.Object({
    name: Type.String(),
    email: Type.String({ format: "email" }),
});

// type Booking = Type.Static<typeof bookingSchema>;

function handleBooking(fastify: FastifyInstance) {
    fastify.post("/booking", { schema: { body: bookingSchema } }, async (request, reply) => {
        // const body = request.body as Booking;
        reply.status(200).send({ message: "Booking received." })
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