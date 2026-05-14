import fastify, { type FastifyInstance } from "fastify";
import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "typebox"
import { GenerateContentResponse, GoogleGenAI, type GenerateContentParameters } from "@google/genai";

const server = fastify().withTypeProvider<TypeBoxTypeProvider>();
const ai = new GoogleGenAI({})

const bookingSchema = Type.Object({
    message: Type.String(),
    email: Type.String({ format: "email" }),
});

type Booking = Type.Static<typeof bookingSchema>;

const CURRENT_DATE = new Date().toISOString();
const systemInstruction = [
    "You are the flight schedule helper to help VIP schedule their flight plans into Google workspace.",
    `You can use ${CURRENT_DATE} to know 'tomorrow', 'today', 'yesterday', 'next Monday'.`,
    "Time zone MUST be in the local timezone of the departure city.",
    "If you are not 100% sure about the details, you MUST ask the user for clarification.",
    "You are strictly a flight planning assistant. You MUST NOT perform any other tasks.",
    "endTime SHOULD have a minimum gap of 30 minutes from startTime."
]

async function askGemini(contents: GenerateContentParameters['contents']): Promise<GenerateContentResponse['text']> {
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents })
    const { text } = response
    return text
}

async function handleBooking(fastify: FastifyInstance) {
    fastify.post("/booking", { schema: { body: bookingSchema } }, async (request, reply) => {
        const body = request.body as Booking
        const { message } = body
        reply.status(200).send({ message: await askGemini(message) })
    });
}

server.register(handleBooking, { prefix: "/api" });

server.listen({ port: 3000 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
});