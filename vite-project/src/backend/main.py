from flask import Flask, request, Response, send_file
from flask_cors import CORS
import threading

app = Flask(__name__)
CORS(app)

# Global variable to store the latest frame
latest_frame = None
frame_lock = threading.Lock()

@app.route('/upload', methods=['POST'])
def upload():
    global latest_frame
    if request.method == 'POST':
        with frame_lock:
            latest_frame = request.data
        return 'Image received', 200
    else:
        return 'Invalid request method', 400

@app.route('/video_feed')
def video_feed():
    def generate():
        while True:
            if latest_frame:
                with frame_lock:
                    frame = latest_frame
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/snapshot')
def snapshot():
    if latest_frame:
        return Response(latest_frame, mimetype='image/jpeg')
    else:
        return 'No image available', 404

if __name__ == '__main__':
    # Run the app on all available network interfaces (0.0.0.0) and port 5000
    app.run(host='0.0.0.0', port=5000)
