import Request from './request';

/*************** USER AUTH REQUESTS ***************/

export function lead(method, body, cb) {
    Request('lead', method, body, cb);
}

/*************** END USER AUTH REQUESTS ***************/