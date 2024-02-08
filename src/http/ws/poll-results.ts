import { FastifyInstance } from "fastify";
import { z } from "zod";
import { voting } from "../utils/voting-pub-sub";

export async function pollResults(app: FastifyInstance) {
    //requisição continua
    //ver resultados de uma determinada enquete
    app.get('/polls/:pollId/results', {websocket: true}, (connection, request) =>{

        const getPollParams = z.object({
            pollId: z.string().uuid(),
        });

        const {pollId} = getPollParams.parse(request.params);

        voting.subscriber(pollId,(message)=>{
            connection.socket.send(JSON.stringify(message));
        })


       

    });
    
}

// pub/Sub - Publish