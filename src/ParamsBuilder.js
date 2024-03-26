import ApiRequestError from "./ApiRequestError.js";

export default class ParamsBuilder {
    /**
     * @constructor
     * @description Create a new ParamsBuilder instance
     * @param {Object} params - The input parameters
     * @param {Array} requiredProperties - The required properties
     * @example new ParamsBuilder(params, ['property1', 'property2'])
     */
    constructor(params, requiredProperties=[]) {
        this.inputParams = params;
        this.outputParams = {};

        for (let key of requiredProperties) {
            if (!params[key]) {
                throw new ApiRequestError(`No ${key} provided.`, 400);
            }
        }
    }

    /**
     * @function filterProperties
     * @description Filter the properties based on a list of strings
     * @param {Array} properties - The allowed properties
     * @returns {ParamsBuilder} The ParamsBuilder instance
     * @example filterProperties(['property1', 'property2'])
     */
    filterProperties(properties, prefix=null) {
        const filteredProps = properties.reduce((acc, key) => {
            acc[key] = this.inputParams[key];
            return acc;
        }, {});

        Object.keys(filteredProps).forEach(key => 
            filteredProps[key] === undefined && delete filteredProps[key]);

        if (prefix) this.outputParams[prefix] = filteredProps;
        else this.outputParams = { ...this.outputParams, ...filteredProps };

        return this;
    }

    /**
     * @function filterStringArray
     * @description Filter a string array
     * @param {String} keyName - The key name
     * @param {String} prefix - The prefix
     * @returns {ParamsBuilder} The ParamsBuilder instance
     * @example filterStringArray('keyName', 'prefix')
     * 
     * What is a string object array?
     * It is a string that contains key-value pairs separated by commas and colons.
     * Example: 'key1:value1,key2:value2'
     */
    filterStringObjectArray(keyName, prefix, skipIf=()=>false) {
        if (skipIf()) return this;
        const data = this.inputParams[keyName];
        const arr = data.split(',');
        const obj = arr.reduce((acc, item) => {
            const objArr = item.split(':');
            acc[objArr[0]] = objArr[1];
            return acc;
        }, {});
        this.outputParams[prefix] = obj;

        return this;
    }

    /**
     * @function getAssociationOptions
     * @description Get the association options for a single association
     * @param {Object} Model - The Sequelize model
     * @param {String} associationName - The associationName parameter
     * @returns {ParamsBuilder} The ParamsBuilder instance
     * @example getAssociationOptions(Model, 'associationName')
     */
    filterAssociation(Model, associationName, skipIf=()=>false) {
        if (skipIf()) return this;

        const associations = Object.values(Model.associations);
        if (!associations.find(a => a.as === associationName)) {
            throw new ApiRequestError(`No association found with name ${associationName}. Possible associations are: ${associations.map(a => a.as).join(', ')};`, 400);
        }

        this.outputParams.include = associationName;
        
        return this;
    }

    /**
     * @function filterAssociations
     * @description Get the association options for multiple associations
     * @param {Object} Model - The Sequelize model
     * @param {String} includeParameter - The include parameter
     * @returns {ParamsBuilder} The ParamsBuilder instance
     * @example filterAssociations(Model, 'association1,association2:subassociation1:subassociation2')
     */
    filterAssociations(Model, includeParameter, skipIf=()=>false) {
        if (skipIf()) return this;

        const getAssociation = (associations, as='') => {
            const association = associations.find(a => a.as === as);
            if (!association) throw new ApiRequestError(`Invalid association: ${as}`, 400);
            return association.target;
        }

        const directAssociations = Object.values(Model.associations);
        const requestedAssociations = this.inputParams[includeParameter].split(',');
        const results = [];
        
        for (let i = 0; i < requestedAssociations.length; i++) {
            const requestArray = requestedAssociations[i].split('.');
            const hasSubassociations = requestArray.length > 1;
            const associationName = hasSubassociations ? requestArray[0] : requestedAssociations[i];
            
            const association = getAssociation(directAssociations, associationName);
            const result = { model: association, as: associationName };

            if (hasSubassociations) {
                const subassociations = Object.values(result.model.associations);
                const subassociationsNames = requestArray[1].split(':');
                const subresults = [];
                for (let j = 0; j < subassociationsNames.length; j++) {
                    const subassociation = getAssociation(subassociations, subassociationsNames[j]);
                    subresults.push({ model: subassociation, as: subassociationsNames[j] });
                }
                result.include = subresults;
            }

            results.push(result);
        }

        this.outputParams[includeParameter] = results;

        return this;
    }

    /**
     * @function build
     * @description Build the output parameters
     * @returns {Object} The output parameters
     * @example build()
     */
    build() {
        return this.outputParams;
    }
}