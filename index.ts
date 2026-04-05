import fastify, { type FastifyInstance } from "fastify";

const server = fastify();

function handleBooking(fastify: FastifyInstance) {
    fastify.get("/booking", async () => {
        return "Hello VIP Workflow!";
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