import ApiRequestError from "../ApiRequestError.js";

class FindAllRequest {
    constructor(Model, params, methodOptions = {}, serviceOptions = {}) {
        this.Model = Model;
        this.params = params;
        this.methodOptions = methodOptions;
        this.serviceOptions = serviceOptions;
    }

    async getResult() {
        const props = {
            page: FindAllRequest.getPageParam(this),
            count: await this.Model.count(),
            pages: 0,
        };

        const query = {};
        
        if (this.params.q) {
            query.where = FindAllRequest.getSearchQuery(this);
        }

        if (this.params.where) {
            query.where = {...query.where, ...FindAllRequest.getWhereParam(this)};
        }

        if (this.methodOptions.include) {
            query.include = FindAllRequest.getAssociationOptions(this);      
        }
        
        query.limit = FindAllRequest.getLimitParam(this);
        query.offset = (props.page - 1) * query.limit;
        props.pages = Math.ceil(props.count / query.limit);

        return { query, props };
    }

    /**
     * @function getSearchQuery
     * @description Get the search query for the findAll method
     * @param {Object} req - The request object
     * @returns {Object} The search query
     * @static
     */
    static getSearchQuery(req) {
        const { searchProperties } = req.serviceOptions.findAll;
        const { q } = req.params;
        if (searchProperties && q) {
            return {
                $or: searchProperties.map(prop => ({ [prop]: { like: '%' + q + '%' } }))
            };
        }

        return null;
    }

    /**
     * @function getLimitParam
     * @description Get the limit param for the findAll method
     * @param {Object} req - The request object
     * @returns {Number} The limit param
     * @static
     */
    static getLimitParam(req) {
        if (!req.params.limit) return req.serviceOptions.findAll.defaultLimit || 10;
        
        return parseInt(req.params.limit);
    }

    /**
     * @function getPageParam
     * @description Get the page param for the findAll method
     * @param {Object} req - The request object
     * @returns {Number} The page param
     * @static
     */
    static getPageParam(req) {
        if (!req.params.page) return req.serviceOptions.findAll.defaultPage || 1;

        return parseInt(req.params.page);
    }

    /**
     * @function getWhereParam
     * @description Get the where param for the findAll method
     * @param {Object} req - The request object
     * @returns {Object} The where param
     * @static
     */
    static getWhereParam(req) {
        const whereProperties = req.options.findAll.whereProperties;
        const whereParam = req.params.where;

        if (!whereProperties) {
            throw new ApiRequestError('No search properties are defined.', 400);
        }

        const validProp = whereProperties.every(prop => Object.keys(whereParam).includes(prop));
        if (!validProp) {
            throw new ApiRequestError(`Invalid where property. Possible properties are: ${whereProperties.join(', ')};`, 400);
        }

        return whereParam;
    }

    /**
     * @function getAssociationOptions
     * @description Get the association options for the findAll method
     * @param {Object} req - The request object
     * @returns {Array} The association options
     * @static
     */
    static getAssociationOptions(req) {
        const getAssociation = (associations, as='') => {
            const association = associations.find(a => a.as === as);
            if (!association) throw new ApiRequestError(`Invalid association: ${as}`, 400);
            return association.target;
        }

        const directAssociations = Object.values(req.Model.associations);
        const requestedAssociations = req.methodOptions.include.split(',');
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
                const associationTargets = subassociationsNames.map(name => getAssociation(subassociations, name));
                result.include = associationTargets;
            }

            results.push(result);
        }

        return results;
    }
}

export default FindAllRequest;
