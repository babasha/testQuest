import { SearchRoute, User } from './types/query';
import fs from 'fs';
const { HOST, PORT } = require('./config');
import cors from '@fastify/cors';
import Fastify, { FastifyRequest } from 'fastify';
import { errorRes, successRes } from './utils/response';
import path from 'path';

const fastify = Fastify({ logger: true });

fastify.register(cors, {
  origin: '*',
  methods: ['GET'],
});

const dataPath = path.join(__dirname, 'data', 'users.json');

fastify.get('/', (req: FastifyRequest<SearchRoute>, res) => {
	fs.readFile(dataPath, 'utf8', (err, data) => {
		try {
			if (err) {
				fastify.log.error('File read failed: ' + err);
				return res.code(500).send(errorRes("Server error"));
			}

			const users: User[] = JSON.parse(data);
			
			const result = users
				.filter((elem) => elem.name.toLowerCase()
				.search(req.query.term?.toLowerCase() ?? '') !== -1);
	
			return res.type('application/json').send(successRes<User[]>(result));
		} catch(e) {
			fastify.log.error(e);
			return res.status(500).send(errorRes("Server error"))
		}
	})
});

const start = async () => {
	try {
		await fastify.listen({port: PORT, host: HOST})
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
