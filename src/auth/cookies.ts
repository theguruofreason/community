const sameSite = ['Strict', 'Lax', 'None'] as const;
type SameSite = typeof sameSite[number];

/** Class representing a browser Cookie */
class Cookie {
    /** Name of the cookie */
    name: string;
    /** Value of the cookie */
    value: string;
    /** Options for the cookie */
    options: CookieOptions = {};

    /**
     * Create a cookie.
     * @param {string} name The name of the cookie.
     * @param {string} value The value of the cookie.
     * @param {CookieOptions} options Options for the cookie such as 'Secure', 'SameSite', etc.
     */
    constructor(name: string, value: string, options: CookieOptions = {}) {
        this.name = name;
        this.value = value;
        this.options = options;
    }

    /**
     * Construct a string to be used as a valid 'Set-Cookie' header.
     * @returns The string of the cookie for use in the 'Set-Cookie' header.
     */
    toString(): string {
        const options: string[] = [];
        if (this.options.secure) options.push("Secure");
        if (this.options.httpOnly) options.push("HttpOnly");
        if (this.options.expiration) options.push(`Expires=${this.options.expiration.toUTCString()}`);
        if (this.options.sameSite) options.push(`SameSite=${this.options.sameSite}`);
        if (this.options.path) options.push(`SameSite=${this.options.sameSite}`);
        if (this.options.domain) options.push(`Domain=${this.options.domain}`);
        if (this.options.path) options.push(`Path=${this.options.path}`);
        const optionString: string = `; ${options.join('; ')}`;
        return `${this.name}=${this.value}${optionString}`;
    }
}

/** Options for the Cookie class representing valid options when passing a cookie as a header */
type CookieOptions = {
    secure?: boolean,
    httpOnly?: boolean,
    expiration?: Date,
    sameSite?: SameSite,
    domain?: string,
    path?: string,
}

/** Class representing a set of cookies. Can be constructed with a request object to automatically add cookie headers to request. */
export default class Cookies {
    private cookies: Cookie[] = [];
    private request?: Request = undefined;

    constructor(cookies: Cookies, request?: Request) {
        this.cookies = cookies.getCookies();
        if (typeof request !== undefined) this.request = request;
    };

    /**
     * Get all the cookies!
     * @returns The array of cookie objects.
     */
    getCookies(): Cookie[] {
        return this.cookies;
    }

    /**
     * Get all the cookie strings!
     * @returns The array of strings formatted for the 'Set-Cookie' header.
     */
    getCookieStrings(): string[] {
        return this.cookies.map(cookie => cookie.toString());
    }

    /**
     * Set a cookie.
     * @param {string} name Name of the cookie.
     * @param {string} value Value of the cookie.
     * @param {string} options Options for the cookie.
     */
    set(name: string, value: string, options?: CookieOptions): void {
        let cookie = this.cookies.find(cookie => cookie.name = name);
        if (cookie) {
            cookie.value = value;
            if (options !== undefined) cookie.options = options;
        } else {
            cookie = new Cookie(
                name,
                value,
                options,
            );
            this.cookies.push(cookie);
        }
        if (this.request) this.request.headers.append("Set-Cookie", cookie.toString());
    };

    /**
     * Remove a cookie from the set of cookies.
     * @param {string} name Name of the cookie to remove.
     */
    remove(name: string): void {
        this.cookies = this.cookies.filter(cookie => cookie.name != name);
    }

    /**
     * Get a specific cookie by name.
     * @param {string} name Name of the cookie to return
     * @returns The cookie.
     */
    get(name: string): Cookie | undefined {
        return this.cookies.find(cookie => cookie.name == name);
    };

    /**
     * Add cookies to a headers object.
     * @param {Headers} headers The headers object to add the 'Set-Cookie' headers to.
     */
    addToHeaders(headers: Headers): void {
        for (let cookie of this.cookies) {
            headers.append("Set-Cookie", cookie.toString());
        }
    };
}