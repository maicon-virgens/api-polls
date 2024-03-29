import z, { number } from "zod";
import { randomUUID } from "crypto";
import {prisma} from "./../lib/prisma";
import { FastifyInstance } from "fastify";
import {redis} from "./../lib/redis";
import { voting } from "../utils/voting-pub-sub";

//criar  voto na enquete
export async function voteOnPoll(app: FastifyInstance) {
    app.post("/polls/:pollId/votes", async(request, reply)=>{

        const voteOnPollBoddy = z.object({
            pollOptionId: z.string().uuid(),
        });

        const voteOnPollParams = z.object({
            pollId: z.string().uuid(),
        });
    
        const {pollId} = voteOnPollParams.parse(request.params);
        const {pollOptionId} = voteOnPollBoddy.parse(request.body);

        let { sessionId } = request.cookies;

        //verificar se o usuário já votou
        if(sessionId){
            const userPreviousVotePoll = await prisma.vote.findUnique({
                where: {
                    sessionId_pollId:{
                        sessionId,
                        pollId,
                    }
                }
            });

            if(userPreviousVotePoll && userPreviousVotePoll.pollOptionId != pollOptionId){
                //apagar o voto anterior e criar um novo
                //usuário porera trocar o voto

                await prisma.vote.delete({
                    where:{
                        id: userPreviousVotePoll.id,
                    }
                });
                //atualizando soma de votos no redis de uma enquete
                const votes = await redis.zincrby(pollId, -1, userPreviousVotePoll.pollOptionId);

                voting.publish(pollId, {
                    pollOptionId: userPreviousVotePoll.pollOptionId,
                    votes: Number(votes),
                });




            }else if(userPreviousVotePoll){
                return reply.status(400).send({message: 'You already voted on this poll'});
            }
        }

        if(!sessionId){
            
            const sessionId = randomUUID();

            reply.setCookie('sessionId', sessionId, {
                path: '/', //quais rotas da aplicação cokie vai esta disponivel / todas
                maxAge: 30*30*24*30, //30 dias
                signed: true,
                httpOnly: true, 
            })
        }  

        await prisma.vote.create({
            data:{
                sessionId,
                pollId,
                pollOptionId,
            }
        });

        //contar os votos 
        //cada enquete vai ter seu proprio rank
        const votes = await redis.zincrby(pollId, 1, pollOptionId);

        voting.publish(pollId, {
            pollOptionId,
            votes: Number(votes),
        });

        return reply.status(201).send();
    });
    
}