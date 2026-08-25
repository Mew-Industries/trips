#!/usr/bin/env python3
"""Chequeo de que un request roto no se lleve puesto al siguiente — task 548.

El backend habla HTTP/1.1 con keep-alive y cloudflared reusa las conexiones al
origen entre requests de gente distinta. Si el server contesta un error sin
consumir el body que el cliente anunció, esos bytes quedan en el socket y el
request SIGUIENTE de esa conexión se parsea desde la basura: un PUT malformado
de cualquiera (el endpoint es público) rompía la lectura de votos de otro
viajero. Esto lo comprueba a mano, porque ningún cliente HTTP normal permite
mandar los requests rotos que hacen falta para provocarlo.

Cada sonda manda un request roto y después un `GET /votes` válido POR LA MISMA
conexión. Pasa si la segunda request devuelve 200 (el body se drenó bien) o si
el server cerró la conexión avisando con `Connection: close` (la otra salida
correcta). Falla si devuelve cualquier otra cosa: eso es el socket desfasado.

Uso:
    python3 check_keepalive.py 127.0.0.1 9299 <token>
    python3 check_keepalive.py votos.mewis.online 443 <token>
"""

import socket
import ssl
import sys
import time

# La sonda del body truncado no es un desfasaje: si el cliente anuncia 100
# bytes y manda 10, lo que mande después ES su body y ningún server puede
# distinguirlo. Lo que se comprueba ahí es que el hilo no quede colgado para
# siempre — el server tiene que cortar por timeout.
TRUNCATED_WAIT = 35


def read_some(sock, wait=0.6):
    time.sleep(wait)
    try:
        return sock.recv(65536)
    except Exception:
        return b""


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    host, port, token = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    tls = port == 443

    def connect(timeout=12):
        s = socket.create_connection((host, port), timeout=timeout)
        if tls:
            s = ssl.create_default_context().wrap_socket(s, server_hostname=host)
        return s

    h = ("Host: %s\r\n" % host).encode()
    cases = [
        ("PUT con body gigante (9000 B)",
         b"PUT /votes HTTP/1.1\r\n" + h + b"content-length: 9000\r\n\r\n" + b"x" * 9000),
        ("PUT con content-length no numerico",
         b"PUT /votes HTTP/1.1\r\n" + h + b"content-length: abc\r\n\r\n" + b"y" * 50),
        ("PUT chunked (el server no lo desarma)",
         b"PUT /votes HTTP/1.1\r\n" + h + b"transfer-encoding: chunked\r\n\r\n5\r\nhola!\r\n0\r\n\r\n"),
        ("PUT a una ruta que no existe, con body",
         b"PUT /nope HTTP/1.1\r\n" + h + b"content-length: 20\r\n\r\n" + b"z" * 20),
        ("PUT con json invalido",
         b"PUT /votes HTTP/1.1\r\n" + h + b"content-length: 7\r\n\r\nnotjson"),
        ("PUT con content-length 0",
         b"PUT /votes HTTP/1.1\r\n" + h + b"content-length: 0\r\n\r\n"),
        ("GET con un body colgado",
         b"GET /health HTTP/1.1\r\n" + h + b"content-length: 12\r\n\r\nbasura-aqui!"),
        ("OPTIONS con un body colgado",
         b"OPTIONS /votes HTTP/1.1\r\n" + h + b"content-length: 5\r\n\r\nhola!"),
    ]

    failed = 0
    for label, raw in cases:
        s = connect()
        s.sendall(raw)
        first = read_some(s)
        line1 = first.split(b"\r\n")[0].decode(errors="replace") if first else "(sin respuesta)"
        closed = b"connection: close" in first.lower()
        second = b""
        try:
            s.sendall(("GET /votes?u=%s HTTP/1.1\r\nHost: %s\r\n\r\n" % (token, host)).encode())
            second = read_some(s)
        except Exception:
            second = b""
        line2 = second.split(b"\r\n")[0].decode(errors="replace") if second else "(conexion cerrada)"
        good = second.startswith(b"HTTP/1.1 200") or (not second and closed)
        failed += 0 if good else 1
        print("%s %-40s | 1ra: %-34s | 2da: %s"
              % ("✓" if good else "✗", label, line1, line2))
        try:
            s.close()
        except Exception:
            pass

    # Body truncado: el hilo se tiene que liberar solo.
    s = connect(timeout=TRUNCATED_WAIT + 10)
    s.sendall(b"PUT /votes HTTP/1.1\r\n" + h + b"content-length: 100\r\n\r\n0123456789")
    t0 = time.time()
    try:
        data = s.recv(65536)
        released, how = True, "cerro a los %.0fs" % (time.time() - t0) if not data else "contesto"
    except Exception as e:
        released, how = False, "sigue colgada tras %.0fs (%s)" % (time.time() - t0, e)
    failed += 0 if released else 1
    print("%s %-40s | %s" % ("✓" if released else "✗",
                             "PUT con body truncado no cuelga el hilo", how))
    try:
        s.close()
    except Exception:
        pass

    print("\n%s" % ("todo verde" if not failed else "%d sonda(s) fallaron" % failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
