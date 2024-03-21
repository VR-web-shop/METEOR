
/**
 * @class ApiRequestError
 * @classdesc Represents an error that occurred during an API request.
 * @extends Error
 * @property {number} status - The HTTP status code of the error.
 * @property {string} message - The error message.
 */
export default class ApiRequestError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
