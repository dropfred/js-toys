# openssl req -x509 -nodes -newkey rsa:2048 -keyout localhost.key -out localhost.cert

from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl
import sys

port = int(sys.argv[1]) if len(sys.argv) == 2 else 5000

def ssl_context(cert, key):
    context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
    context.load_cert_chain(cert, key)
    context.set_ciphers('@SECLEVEL=1:ALL')
    return context

server = HTTPServer(('localhost', port), SimpleHTTPRequestHandler)
server.socket = ssl_context('localhost.cert', 'localhost.key').wrap_socket(server.socket, server_side=True)
server.serve_forever()
