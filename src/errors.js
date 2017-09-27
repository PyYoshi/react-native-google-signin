export class GoogleSigninError extends Error {
    constructor(error, code) {
        super(error);
        this.name = 'GoogleSigninError';
        this.code = code;
    }
}

export class GoogleSigninErrorCancelled extends Error {
    constructor(error, code) {
        super(error);
        this.name = 'GoogleSigninErrorCancelled';
        this.code = code;
    }
}
