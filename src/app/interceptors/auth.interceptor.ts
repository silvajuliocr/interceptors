import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { throwError, Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private AUTH_HEADER = 'Authorization';
  private token = 'secrettoken';
  private refreshTokenInProgress = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(
    null
  );

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (!request.url.includes('auth')) {
      return next.handle(request);
    }
    /*if (!req.headers.has('Content-Type')) {
      req = req.clone({
        headers: req.headers.set('Content-Type', 'application/json')
      });
    }*/

    //req = this.addAuthenticationToken(req);

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error && error.status === 401) {
          // 401 errors are most likely going to be because we have an expired token that we need to refresh.
          if (this.refreshTokenInProgress) {
            // If refreshTokenInProgress is true, we will wait until refreshTokenSubject has a non-null value
            // which means the new token is ready and we can retry the request again
            return this.refreshTokenSubject.pipe(
              filter(result => result !== null),
              take(1),
              switchMap(() => next.handle(this.addAuthenticationToken(request)))
            );
          } else {
            this.refreshTokenInProgress = true;

            // Set the refreshTokenSubject to null so that subsequent API calls will wait until the new token has been retrieved
            this.refreshTokenSubject.next(null);

            return this.refreshAccessToken().pipe(
              switchMap((success: boolean) => {
                // When the call to refreshToken completes we reset the refreshTokenInProgress to false
                // for the next time the token needs to be refreshed
                this.refreshTokenInProgress = false;
                this.refreshTokenSubject.next(success);

                return next.handle(this.addAuthenticationToken(request));
              }),
              catchError((err: any) => {
                this.refreshTokenInProgress = false;
                return throwError(error);
              })
            );
          }
        } else {
          return throwError(error);
        }
      })
    );
  }

  private refreshAccessToken(): Observable<any> {
    return of('secret token');
  }

  private addAuthenticationToken(request: HttpRequest<any>): HttpRequest<any> {
    return request.clone({
      headers: request.headers.set(this.AUTH_HEADER, 'Bearer' + this.token)
    });
  }
}
