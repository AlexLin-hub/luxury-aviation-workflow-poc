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
    startTime: Type.Optional(Type.String({
        description: "MANDATORY if status is SUCCESS. The flight departure time in ISO 8601 format."
    })),
    endTime: Type.Optional(Type.String({
        description: "MANDATORY if status is SUCCESS. The estimated arrival time in ISO 8601, rounded to the nearest 30 minutes."
    })),
    startTimeZone: Type.Optional(Type.String({
        description: "MANDATORY if status is SUCCESS. The IANA timezone name of the departure city (e.g., 'Asia/Taipei')."
    })),
    endTimeZone: Type.Optional(Type.String({
        description: "MANDATORY if status is SUCCESS. The IANA timezone name of the arrival city (e.g., 'Asia/Tokyo')."
    })),
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
    "Estimate the flight duration for the 'endTime', but you MUST round the 'endTime' to the nearest 30 minutes (e.g., ending in :00 or :30).",
    "Timezones MUST be in the local timezone of the departure city.",
    "If you are not 100% sure about the details, you MUST ask the user for clarification.",
    "Convert all departure and arrival locations into their official 3-letter IATA airport codes. If the user provides a city with multiple airports (like London or New York), pick the primary international airport.",
    "If the location does not exist, or does not have a valid IATA airport code (like 'ABC'), you MUST set the status to ERROR and ask the user for a valid city or airport.",
    "If you have all the flight details, set status to 'SUCCESS'.If the user asks for something unrelated, or if you need to ask for clarification, set status to 'ERROR' and put your question in the 'message' field.",
    "If the status is SUCCESS, you MUST include the 'from', 'to', 'startTime', and 'endTime' fields.",
    "You are strictly a flight planning assistant. You MUST NOT perform any other tasks.",
    "You MUST NOT include any conversational text, thought process, or explanations inside the JSON fields. The fields must contain ONLY the exact final values."
]

async function askGemini(contents: GenerateContentParameters['contents']): Promise<Gemini> {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", contents, config: {
            systemInstruction: systemInstruction.join("\n"),
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