using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms; // Requires reference to System.Windows.Forms

namespace EarthGuardLauncher
{
    class Program
    {
        static void Main(string[] args)
        {
            // CONFIGURATION
            // Change this URL to your live website URL when deploying!
            string liveUrl = "https://your-website-url.com"; 
            
            // For local testing: try to find the index file in the same folder
            string localFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "seismic_index.html");
            string target = liveUrl;

            if (File.Exists(localFile))
            {
                target = localFile;
            }

            // Command logic: Try Edge PWA -> Chrome PWA -> Default
            try 
            {
                LaunchBrowser("msedge", target);
            }
            catch 
            {
                try 
                {
                    LaunchBrowser("chrome", target);
                }
                catch
                {
                    Process.Start(target);
                }
            }
        }

        static void LaunchBrowser(string browserExe, string url)
        {
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = browserExe;
            psi.Arguments = "--app=\"" + url + "\" --start-maximized";
            psi.UseShellExecute = true;
            Process.Start(psi);
        }
    }
}
