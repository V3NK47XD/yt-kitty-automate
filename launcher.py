import subprocess
import sys
import time
import os

def main():
    print("🚀 Launcher starting...")
    
    # Start Admin App as a persistent process
    admin_process = subprocess.Popen([sys.executable, "admin_app.py"])
    print("🌐 Admin App started at http://127.0.0.1:5000")
    
    main_process = None
    
    def start_main():
        nonlocal main_process
        print("Starting main application...")
        main_process = subprocess.Popen([sys.executable, "main.py"])

    start_main()

    try:
        while True:
            # 1. Check if main process died unexpectedly
            if main_process is None or main_process.poll() is not None:
                print("🔄 Main process exited. Restarting...")
                start_main()

            # 2. Check for restart signal from Admin App
            if os.path.exists("restart.flag"):
                print("🚩 Restart signal received. Applying changes...")
                if main_process:
                    main_process.terminate()
                    main_process.wait()
                
                # Remove the flag
                try:
                    os.remove("restart.flag")
                except OSError:
                    pass
                
                start_main()

            time.sleep(1) # Poll every second to avoid CPU spike
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping launcher...")
        if main_process:
            main_process.terminate()
        if admin_process:
            admin_process.terminate()
    except Exception as e:
        print(f"❌ Launcher Error: {e}")
        if main_process: main_process.terminate()
        if admin_process: admin_process.terminate()

if __name__ == "__main__":
    main()
