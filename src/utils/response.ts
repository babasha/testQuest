export const successRes = <T> (data: T) => {
	return { 
		data,
		success: true
	}
}

export const errorRes = (errMessage: string, code: number = 500) => {
	return { 
		data: [],
		success: false,
		error: {
			message: errMessage,
			code
		}
	}
}