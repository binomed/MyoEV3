// Copyright (C) 2013-2014 Thalmic Labs Inc.
// Confidential and not for redistribution. See LICENSE.txt.
#define _USE_MATH_DEFINES
#include <cmath>
#include <iostream>
#include <iomanip>
#include <stdexcept>
#include <string>
#include <Windows.h>
#include <WinInet.h>
#include <time.h>
#pragma comment (lib, "Wininet.lib")
#pragma comment (lib, "urlmon.lib")
#define POST 1
#define GET 0
#define NODE_HTTP_PORT      8090 


// The only file that needs to be included to use the Myo C++ SDK is myo.hpp.
#include <myo/myo.hpp>

static unsigned long timestamp;
static bool geste = false;

void Request(int Method, LPCSTR Host, LPCSTR url, LPCSTR header, LPSTR data);

// Classes that inherit from myo::DeviceListener can be used to receive events from Myo devices. DeviceListener
// provides several virtual functions for handling different kinds of events. If you do not override an event, the
// default behavior is to do nothing.
class DataCollector : public myo::DeviceListener {
public:
	DataCollector()
		: roll_w(0), pitch_w(0), yaw_w(0), roll(0), pitch(0), yaw(0), currentPose(), acc_x(0), acc_z(0), acc_y(0), gyro_x(0), gyro_z(0), gyro_y(0)
	{
	}
	// onOrientationData() is called whenever the Myo device provides its current orientation, which is represented
	// as a unit quaternion.
	void onOrientationData(myo::Myo* myo, uint64_t timestamp, const myo::Quaternion<float>& quat)
	{
		using std::atan2;
		using std::asin;
		using std::sqrt;

		// Calculate Euler angles (roll, pitch, and yaw) from the unit quaternion.
		roll = atan2(2.0f * (quat.w() * quat.x() + quat.y() * quat.z()),
			1.0f - 2.0f * (quat.x() * quat.x() + quat.y() * quat.y()));
		pitch = asin(2.0f * (quat.w() * quat.y() - quat.z() * quat.x()));
		yaw = atan2(2.0f * (quat.w() * quat.z() + quat.x() * quat.y()),
			1.0f - 2.0f * (quat.y() * quat.y() + quat.z() * quat.z()));

		// Convert the floating point angles in radians to a scale from 0 to 20.
		roll_w = static_cast<int>((roll + (float)M_PI) / (M_PI * 2.0f) * 18);
		pitch_w = static_cast<int>((pitch + (float)M_PI / 2.0f) / M_PI * 18);
		yaw_w = static_cast<int>((yaw + (float)M_PI) / (M_PI * 2.0f) * 18);
	}

	// onPose() is called whenever the Myo detects that the person wearing it has changed their pose, for example,
	// making a fist, or not making a fist anymore.
	void onPose(myo::Myo* myo, uint64_t timestamp, myo::Pose pose)
	{
		currentPose = pose;

		// Vibrate the Myo whenever we've detected that the user has made a fist.
		if (pose == myo::Pose::fist) {
			myo->vibrate(myo::Myo::vibrationMedium);
		}
	}

	void onGyroscopeData(myo::Myo* myo, uint64_t timestamp, const myo::Vector3<float>& gyro)
	{
		gyro_x = gyro.x();
		gyro_y = gyro.y();
		gyro_z = gyro.z();

	}

	void onAccelerometerData(myo::Myo* myo, uint64_t timestamp, const myo::Vector3<float>& accel)
	{
		acc_x = accel.x();
		acc_y = accel.y();
		acc_z = accel.z();

	}

	// There are other virtual functions in DeviceListener that we could override here, like onAccelerometerData().
	// For this example, the functions overridden above are sufficient.

	// We define this function to print the current values that were updated by the on...() functions above.
	void print()
	{
		// Clear the current line
		std::cout << '\r';

		// Pose::toString() provides the human-readable name of a pose. We can also output a Pose directly to an
		// output stream (e.g. std::cout << currentPose;). In this case we want to get the pose name's length so
		// that we can fill the rest of the field with spaces below, so we obtain it as a string using toString().
		std::string poseString = currentPose.toString();

		unsigned long timeTmp = time(NULL);

		if (poseString.compare("waveIn") == 0 && (timeTmp - timestamp <= 1) && geste){
			
			geste = false;
			Request(GET, "localhost", "?gesture=wave_in", NULL, NULL);
		}
		else if (poseString.compare("waveOut") == 0 && (timeTmp - timestamp <= 1) && geste){
			
			geste = false;
			Request(GET, "localhost", "?gesture=wave_out", NULL, NULL);
		}
		else if (poseString.compare("fist") == 0){
			timestamp = time(NULL);
			geste = true;
			//clavier.generateKey('F',false);
			/*char URL[1024];
			char* geturi = L"?json=%s";
			wsprintfW( URL, geturi, toJson() );*/
			//std::cout << toJson();

		}
		std::string url("?json=");
		url += toJson();
		Request(GET, "localhost", url.c_str(), NULL, NULL);

		float realRoll = (roll + (float)M_PI) / (M_PI * 2.0f);
		float realPitch = (pitch + (float)M_PI / 2.0f) / M_PI;
		float realYaw = (yaw + (float)M_PI) / (M_PI * 2.0f);
		/*std::cout << "[roll : " << realRoll << ';' << "pitch : " << realPitch << ';' << "yaw : " << realYaw << ']'
		<< std::flush;*/
		/*std::cout << "[gyro_x : " << gyro_x << ']'
		<< std::flush;*/

		std::cout << "[" << acc_z << ']'
			<< std::flush;



		// Output the current values
		/*std::cout << '[' << std::string(roll_w, '*') << std::string(18 - roll_w, ' ') << ']'
		<< '[' << std::string(pitch_w, '*') << std::string(18 - pitch_w, ' ') << ']'
		<< '[' << std::string(yaw_w, '*') << std::string(18 - yaw_w, ' ') << ']'
		<< '[' << poseString << std::string(16 - poseString.size(), ' ') << ']'
		<< std::flush;*/
	}

	std::string toJson(){

		std::string result("{");
		result += "\"roll\":" + std::to_string(roll);
		result += ",\"pitch\":" + std::to_string(pitch);
		result += ",\"yaw\":" + std::to_string(yaw);
		result += ",\"pose\":\"" + currentPose.toString() + "\"";
		result += ",\"acc\":[" + std::to_string(acc_x) + "," + std::to_string(acc_y) + "," + std::to_string(acc_z) + "]";
		result += ",\"gyro\":[" + std::to_string(gyro_x) + "," + std::to_string(gyro_y) + "," + std::to_string(gyro_z) + "]";
		result += "}";
		return result;

	}

	// These values are set by onOrientationData() and onPose() above.
	int roll_w, pitch_w, yaw_w;
	float acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z, roll, pitch, yaw;
	myo::Pose currentPose;
};

int main(int argc, char** argv)
{
	// We catch any exceptions that might occur below -- see the catch statement for more details.
	try {
		timestamp = time(NULL);
		std::cout << "Calling server" << std::endl;
		
		// First, we create a Hub. The Hub provides access to one or more Myos.
		myo::Hub hub;

		std::cout << "Attempting to find a Myo..." << std::endl;

		// Next, we try to find a Myo (any Myo) that's nearby and connect to it. waitForAnyMyo() takes a timeout
		// value in milliseconds. In this case we will try to find a Myo for 10 seconds, and if that fails, the function
		// will return a null pointer.
		myo::Myo* myo = hub.waitForMyo(10000);

		// If waitForAnyMyo() returned a null pointer, we failed to find a Myo, so exit with an error message.
		if (!myo) {
			throw std::runtime_error("Unable to find a Myo!");
		}

		// We've found a Myo, let's output its MAC address.
		std::cout << "Connected to a Myo armband!" << std::endl << std::endl;


		// Next we construct an instance of our DeviceListener, so that we can register it with the Hub.
		DataCollector collector;

		// Hub::addListener() takes the address of any object whose class inherits from DeviceListener, and will cause
		// Hub::run() to send events to all registered device listeners.
		hub.addListener(&collector);

		// Finally we enter our main loop.
		while (1) {
			// In each iteration of our main loop, we run the Myo event loop for a set number of milliseconds.
			// In this case, we wish to update our display 20 times a second, so we run for 1000/20 milliseconds.
			hub.run(1000 / 20);
			// After processing events, we call the print() member function we defined above to print out the values we've
			// obtained from any events that have occurred.
			collector.print();
		}

		// If a standard exception occurred, we print out its message and exit.
	}
	catch (const std::exception& e) {
		std::cerr << "Error: " << e.what() << std::endl;
		std::cerr << "Press enter to continue.";
		std::cin.ignore();
		return 1;
	}
}


void Request(int Method, LPCSTR Host, LPCSTR url, LPCSTR header, LPSTR data)
{
	try{
		//Retrieve default http user agent
		char httpUseragent[512];
		DWORD szhttpUserAgent = sizeof(httpUseragent);
		ObtainUserAgentString(0, httpUseragent, &szhttpUserAgent);

		char m[5];

		if (Method == GET)
			strcpy(m, "GET\0");
		else
			strcpy(m, "POST\0");

		//http://msdn.microsoft.com/en-us/library/windows/desktop/aa385096%28v=vs.85%29.aspx
		HINTERNET internet = InternetOpenA(httpUseragent, INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
		if (internet != NULL)
		{
			//http://msdn.microsoft.com/en-us/library/windows/desktop/aa384363%28v=vs.85%29.aspx
			HINTERNET connect = InternetConnectA(internet, Host, NODE_HTTP_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
			if (connect != NULL)
			{
				//http://msdn.microsoft.com/en-us/library/windows/desktop/aa384233%28v=vs.85%29.aspx
				HINTERNET request = HttpOpenRequestA(connect, m, url, "HTTP/1.1", NULL, NULL,
					INTERNET_FLAG_HYPERLINK | INTERNET_FLAG_IGNORE_CERT_CN_INVALID |
					INTERNET_FLAG_IGNORE_CERT_DATE_INVALID |
					INTERNET_FLAG_IGNORE_REDIRECT_TO_HTTP |
					INTERNET_FLAG_IGNORE_REDIRECT_TO_HTTPS |
					INTERNET_FLAG_NO_AUTH |
					INTERNET_FLAG_NO_CACHE_WRITE |
					INTERNET_FLAG_NO_UI |
					INTERNET_FLAG_PRAGMA_NOCACHE |
					INTERNET_FLAG_RELOAD, NULL);

				if (request != NULL)
				{
					int datalen = 0;
					if (data != NULL) datalen = strlen(data);
					int headerlen = 0;
					if (header != NULL) headerlen = strlen(header);

					//http://msdn.microsoft.com/en-us/library/windows/desktop/aa384247%28v=vs.85%29.aspx
					HttpSendRequestA(request, header, headerlen, data, datalen);

					//http://msdn.microsoft.com/en-us/library/windows/desktop/aa384350%28v=vs.85%29.aspx
					InternetCloseHandle(request);
				}
			}
			InternetCloseHandle(connect);
		}
		InternetCloseHandle(internet);
	}
	catch (...) {}
}
