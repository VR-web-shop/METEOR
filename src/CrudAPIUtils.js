
/**
 * @function getWhereString
 * @description Get the where string for the query
 * @param {Object} whereObject - The where object
 * @param {String} whereString - The where string
 * @returns {String} The where string
 * @throws {Error} Where parameter must be an object
 * @example getWhereString({ key1: 'value1', key2: 'value2' })
 */
function getWhereString(whereObject, whereString = '') {

    if (typeof whereObject !== 'object') {
        throw new Error('Where parameter must be an object.');
    }
    
    for (let i = 0; i < Object.keys(whereObject).length; i++) {
        const key = Object.keys(whereObject)[i];
        const value = whereObject[key];
        whereString += `${key}:${value}`;
        
        if (i < Object.keys(whereObject).length - 1) {
            whereString += ',';
        }
    }

    return whereString;
}

/**
 * @function getIncludeString
 * @description Get the include string for the query
 * @param {Array} includeArray - The include array
 * @param {String} includeString - The include string
 * @returns {String} The include string
 * @throws {Error} includeArray must be an array
 * @throws {Error} includeArray parameter must be an object
 * @throws {Error} includeArray parameter must have a model property
 * @throws {Error} includeArray parameter must be an array of strings
 * @example getIncludeString([{ model: 'Texture', include: ['Image'] }])
 * @example getIncludeString([{ model: 'Texture', include: ['Image', 'TextureType'] }])
 */
function getIncludeString(includeArray, includeString = '') {

    if (!Array.isArray(includeArray)) {
        throw new Error('Include parameter must be an array.');
    }

    for (let i = 0; i < includeArray.length; i++) {

        // Check if include is a object
        if (typeof includeArray[i] !== 'object') {
            throw new Error('Include parameter must be an object.');
        }

        // Check if include has the model property
        if (!includeArray[i].model) {
            throw new Error('Include parameter must have a model property.');
        }

        includeString += includeArray[i].model;
        // Check if include has the include property
        if (includeArray[i].include) {
            includeString += '.';

            // Check if include is an array
            if (!Array.isArray(includeArray[i].include)) {
                throw new Error('Include parameter must be an array of strings.');
            }

            for (let j = 0; j < includeArray[i].include.length; j++) {
                includeString += includeArray[i].include[j];

                if (j < includeArray[i].include.length - 1) {
                    includeString += ':';
                }
            }
        }

        if (i < includeArray.length - 1) {
            includeString += ',';
        }
    }

    return includeString;
}

export default {
    getWhereString,
    getIncludeString
}
