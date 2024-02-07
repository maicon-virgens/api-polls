import z from "zod";
import {prisma} from "./../lib/prisma";
import { FastifyInstance } from "fastify";


export async function createPoll(app: FastifyInstance) {
    app.post("/polls", async(request, reply)=>{

        const createPollsBoddy = z.object({
            title: z.string(),
            options: z.array(z.string())
        });
    
        const {title, options} = createPollsBoddy.parse(request.body);
    
        const poll = prisma.poll.create({
            data: {
                title,
                options: {
                    createMany: {
                        data: options.map(option=>{
                            return {title: option}
                        }),
                    }
                }
            }
        });
    
        return reply.status(201).send({pollId: (await poll).id});
    });
    
}