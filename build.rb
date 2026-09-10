# encoding: UTF-8
# build.rb — bundle the split project (index.html + css/ + js/) into a single
# self-contained HTML for publishing as a Claude Artifact.
#
# Usage:  ruby build.rb [output_path]
# Default output: dist/cd-player.bundle.html
require 'fileutils'
require 'base64'

def read_utf8(path); File.read(path, encoding: 'UTF-8'); end

root   = File.expand_path(File.dirname(__FILE__))
html   = read_utf8(File.join(root, 'index.html'))
css    = read_utf8(File.join(root, 'css/style.css'))
tracks = read_utf8(File.join(root, 'js/tracks.js'))
player = read_utf8(File.join(root, 'js/player.js'))

head = html[/<head>(.*?)<\/head>/m, 1]
body = html[/<body>(.*?)<\/body>/m, 1]

title = head[/<title>.*?<\/title>/m]
# keep the Google Fonts <link>s, drop the local stylesheet link (we inline it)
links = head.scan(/<link[^>]*>/).reject { |l| l.include?('css/style.css') }.join("\n  ")

# inline local scripts into the body markup (tolerate a ?v= cache-busting query)
body = body.sub(%r{<script src="js/tracks\.js(?:\?[^"]*)?"></script>}, "<script>\n#{tracks}\n</script>")
body = body.sub(%r{<script src="js/player\.js(?:\?[^"]*)?"></script>}, "<script>\n#{player}\n</script>")

# The Artifact host wraps content in <!doctype>/<html>/<head>/<body>, so emit
# only the inner content: title + font links + inlined <style> + body markup.
bundle = <<~HTML
  #{title}
  #{links}
  <style>
  #{css}
  </style>
  #{body.strip}
HTML

# inline local cover images as data URIs so the artifact is self-contained
MIME = {'.png'=>'image/png', '.jpg'=>'image/jpeg', '.jpeg'=>'image/jpeg', '.webp'=>'image/webp', '.gif'=>'image/gif'}
bundle = bundle.gsub(%r{assets/covers/[\w.-]+\.(?:png|jpe?g|webp|gif)}) do |rel|
  file = File.join(root, rel)
  if File.file?(file)
    mime = MIME[File.extname(file).downcase] || 'image/png'
    "data:#{mime};base64,#{Base64.strict_encode64(File.binread(file))}"
  else
    rel
  end
end

out = ARGV[0] || File.join(root, 'dist', 'cd-player.bundle.html')
FileUtils.mkdir_p(File.dirname(out))
File.write(out, bundle)
puts "built #{out} (#{bundle.bytesize} bytes)"
