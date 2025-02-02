import { Injectable } from "@angular/core";
import { HttpClient, HttpResponse } from "@angular/common/http";
import { JwtHelperService } from "@auth0/angular-jwt";
import { Observable } from "rxjs";
import { of, throwError } from "rxjs";
import { mergeMap, map } from "rxjs/operators";
import { JWTToken } from "../model/JWTToken";

const TOKEN_ID = "token";

/**
 * Manages login and logout of the user of the page.
 */
@Injectable({
  providedIn: "root",
})
export class AuthService {
  constructor(private http: HttpClient, private jwtHelper: JwtHelperService) {}

  /**
   * Logout user by removing its token.
   */
  public logout() {
    localStorage.removeItem(TOKEN_ID);
  }

  /**
   * Returns true only if a valid token exists.
   */
  public isAuthenticated(): boolean {
    const token = this.loadToken();
    return token && !this.jwtHelper.isTokenExpired(token);
  }

  /**
   * @return The lastly received token.
   */
  getToken(): JWTToken {
    const token = this.loadToken();
    const decodedToken = this.decodeToken();
    if (!decodedToken) {
      throw new Error("Decoding the token failed");
    } else if (this.jwtHelper.isTokenExpired(token)) {
      throw new Error("Token expired");
    }
    decodedToken.courseRoles = JSON.parse(<any>decodedToken.courseRoles);
    return decodedToken;
  }

  /**
   * Use the cas authentication method
   */
  public casLogin(): Observable<JWTToken> {
    return throwError("Not implemented yet!"); // TODO: impl cas login
  }

  /**
   * Use the ldap authentication method of the server to login via user name and password
   * @param username The username of a user
   * @param password The password of a user
   * @return Successful observable JWTToken, only if the token is valid.
   */
  public ldapLogin(username: string, password: string): Observable<JWTToken> {
    return this.login(username, password, "/api/v1/login/ldap");
  }

  /**
   * Use the local authentication method of the server to login via user name and password
   * @param username The username of a user
   * @param password The password of a user
   * @return Successful observable JWTToken, only if the token is valid.
   */
  public localLogin(username: string, password: string): Observable<JWTToken> {
    return this.login(username, password, "/api/v1/login/local");
  }

  /**
   * Renews token taken from the http response.
   * @param response The http response.
   */
  public renewToken(response: HttpResponse<any>) {
    const token = this.extractTokenFromHeader(response);
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      this.storeToken(token);
    }
  }

  private login(
    username: string,
    password: string,
    uri: string
  ): Observable<JWTToken> {
    return this.http
      .post<any>(
        uri,
        { username: username, password: password },
        { observe: "response" }
      )
      .pipe(
        map((res) => {
          const token = this.extractTokenFromHeader(res);
          this.storeToken(token);
          return token;
        }),
        mergeMap((token) => {
          const decodedToken = this.decodeToken();
          if (!decodedToken) {
            return throwError("Decoding the token failed");
          } else if (this.jwtHelper.isTokenExpired(token)) {
            return throwError("Token expired");
          }
          return of(decodedToken);
        })
      );
  }

  private decodeToken(): JWTToken | null {
    return this.jwtHelper.decodeToken(localStorage.getItem("token"));
  }

  private extractTokenFromHeader(response: HttpResponse<any>): string {
    const authHeader: string = response.headers.get("Authorization");
    return authHeader ? authHeader.replace("Bearer ", "") : null;
  }

  /**
   * @return Get token as string or null if no token exists.
   */
  public loadToken(): string {
    return localStorage.getItem(TOKEN_ID);
  }

  private storeToken(token: string): void {
    localStorage.setItem(TOKEN_ID, token);
  }

  public requestNewToken(): Observable<void> {
    return this.http.get("/api/v1/login/token", {}).pipe(map(() => null));
  }

  public startTokenAutoRefresh() {
    setInterval(() => {
      if (this.isAuthenticated()) {
        const token = this.getToken();
        if (Math.floor(new Date().getTime() / 1000) + 90 >= token.exp) {
          this.requestNewToken().subscribe(() => {});
        }
      }
    }, 60000);
  }
}
