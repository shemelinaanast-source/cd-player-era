# encoding: UTF-8
# Tiny static file server (UTF-8 safe — works with non-ASCII folder names,
# unlike WEBrick's built-in httpd on Ruby 2.6).
require 'socket'
require 'uri'

PORT = (ARGV[0] || 5500).to_i
ROOT = File.expand_path(File.dirname(__FILE__))
INDEX = 'index.html'

MIME = {
  '.html' => 'text/html; charset=utf-8',
  '.css'  => 'text/css; charset=utf-8',
  '.js'   => 'application/javascript; charset=utf-8',
  '.json' => 'application/json; charset=utf-8',
  '.svg'  => 'image/svg+xml',
  '.png'  => 'image/png', '.jpg' => 'image/jpeg', '.jpeg' => 'image/jpeg',
  '.gif'  => 'image/gif', '.webp' => 'image/webp', '.ico' => 'image/x-icon',
  '.mp3'  => 'audio/mpeg', '.wav' => 'audio/wav', '.ogg' => 'audio/ogg'
}

server = TCPServer.new('127.0.0.1', PORT)
puts "Serving #{ROOT}"
puts "Open  http://localhost:#{PORT}/#{INDEX}"

loop do
  client = server.accept
  Thread.new(client) do |sock|
    begin
      request = sock.gets
      next unless request
      method, raw_path, = request.split(' ')
      while (line = sock.gets) && line != "\r\n"; end # drain headers

      path = URI.decode_www_form_component(raw_path.split('?').first)
      path = "/#{INDEX}" if path == '/'
      file = File.expand_path(File.join(ROOT, path))

      if !file.start_with?(ROOT) || !File.file?(file)
        msg = 'Not Found'
        sock.print "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\n" \
                   "Content-Length: #{msg.bytesize}\r\n\r\n#{msg}"
      else
        body = File.binread(file)
        type = MIME[File.extname(file).downcase] || 'application/octet-stream'
        sock.print "HTTP/1.1 200 OK\r\nContent-Type: #{type}\r\n" \
                   "Content-Length: #{body.bytesize}\r\nCache-Control: no-cache\r\n\r\n"
        sock.write(body) unless method == 'HEAD'
      end
    rescue => e
      STDERR.puts "request error: #{e.class}: #{e.message}"
    ensure
      sock.close rescue nil
    end
  end
end
