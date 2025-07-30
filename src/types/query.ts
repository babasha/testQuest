import { RouteGenericInterface } from 'fastify';

export interface User {
	id:            number;
	name:          string;
	phone:         string;
	email:         string;
	address:       string;
	position_name: string;
	department:    string;
	hire_date:     string;
}

interface ServerError {
	message: string;
	code: number;
}

interface ServerResponse {
	data: User[];
	success: boolean;
	error?: ServerError;
}

export interface SearchRoute extends RouteGenericInterface {
	Querystring: {
		term?: string;
	};
	Reply: ServerResponse;
}