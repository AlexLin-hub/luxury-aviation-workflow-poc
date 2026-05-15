import fastify, { type FastifyInstance } from "fastify";
import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "typebox"
import { GenerateContentResponse, GoogleGenAI, type GenerateContentParameters } from "@google/genai";

const server = fastify().withTypeProvider<TypeBoxTypeProvider>();
const ai = new GoogleGenAI({})

const BookingSchema = Type.Object({
    message: Type.String(),
    email: Type.String({ format: "email" }),
});

const StatusValues = ["SUCCESS", "ERROR"];

const GeminiSchema = Type.Object({
    status: Type.String({
        enum: StatusValues,
        description: "Use SUCCESS if flight is booked, ERROR if you need more info or user is off-topic"
    }),
    from: Type.Optional(Type.String()),
    to: Type.Optional(Type.String()),
    startTime: Type.Optional(Type.String()),
    endTime: Type.Optional(Type.String()),
    message: Type.Optional(Type.String({
        description: "The error message or the question you want to ask the user"
    }))
})

type Booking = Type.Static<typeof BookingSchema>;
type Gemini = Type.Static<typeof GeminiSchema>;

const CURRENT_DATE = new Date().toISOString();
const systemInstruction = [
    "You are the flight schedule helper to help VIP schedule their flight plans into Google workspace.",
    `You can use ${CURRENT_DATE} to know 'tomorrow', 'today', 'yesterday', 'next Monday'.`,
    "Time zone MUST be in the local timezone of the departure city.",
    "endTime SHOULD have a minimum gap of 30 minutes from startTime.",
    "If you are not 100% sure about the details, you MUST ask the user for clarification.",
    "If you have all the flight details, set status to 'SUCCESS'.If the user asks for something unrelated, or if you need to ask for clarification, set status to 'ERROR' and put your question in the 'message' field.",
    "You are strictly a flight planning assistant. You MUST NOT perform any other tasks.",
]

async function askGemini(contents: GenerateContentParameters['contents']): Promise<Gemini> {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", contents, config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: GeminiSchema
        }
    })

    if (!response.text) throw new Error("No response text")

    const data: Gemini = JSON.parse(response.text)
    return data
}

async function handleBooking(fastify: FastifyInstance) {
    fastify.post("/booking", { schema: { body: BookingSchema } }, async (request, reply) => {
        const body = request.body as Booking
        const { message } = body
        const data = await askGemini(message)
        reply.status(200).send({ data })
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