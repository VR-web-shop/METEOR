import { S3Client, PutObjectCommand, DeleteObjectCommand  } from "@aws-sdk/client-s3";

export default class StorageService {
    constructor(endpoint, region, credentials, bucketName, cdnURL, prefix = '') {
        this.Bucket = bucketName;
        this.prefix = prefix;
        this.cdnURL = cdnURL;
        this.s3 = new S3Client({
            endpoint: endpoint,
            region: region,
            credentials: credentials
        });
    }

    async upload(params) {
        const command = new PutObjectCommand(params);
        try {
            await this.s3.send(command);
            return `${this.cdnURL}/${params.Key}`;
        } catch (error) {
            console.error("Error uploading file to S3:", error);
            throw error;
        }
    }

    /**
     * @function uploadFile
     * @description Upload a file to an S3 bucket.
     * @param {Buffer} Body - The file's buffer.
     * @param {string} Key - The key name.
     * @returns {Promise<string>} - The promise.
     * @throws {Error} - The error.
     */
    async uploadFile(Body, Key, ACL='public-read') {
        const { Bucket, prefix } = this;
        return this.upload({ Bucket, Key: `${prefix}${Key}`, Body, ACL });
    }


    /**
     * @function updateFile
     * @description Update a file in an S3 bucket.
     * @param {Buffer} Body - The file's buffer.
     * @param {string} Key - The key name.
     * @returns {Promise} - The promise.
     * @throws {Error} - The error.
     */
    async updateFile(Body, Key, ACL='public-read') {
        const { Bucket } = this;
        return this.upload({ Bucket, Key, Body, ACL });
    }

    /**
     * @function deleteFile
     * @description Delete a file from an S3 bucket.
     * @param {string} Key - The key name.
     * @returns {Promise} - The promise.
     * @throws {Error} - The error.
     */
    async deleteFile(Key) {
        const { Bucket } = this;
        const params = { Bucket, Key };
        const command = new DeleteObjectCommand(params);
        try {
            await this.s3.send(command);
        } catch (error) {
            console.error("Error deleting file from S3:", error);
            throw error;
        }
    }

    /**
     * @function parseKey
     * @description Parse a key.
     * @param {string} url - The url.
     * @returns {string} - The key.
     */
    parseKey(url) {
        return url.replace(`${this.cdnURL}/`, '');
    }
}
