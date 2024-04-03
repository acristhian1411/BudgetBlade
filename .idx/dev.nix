
{ pkgs, ... }: {
  channel = "stable-23.11"; # or "unstable"
    # Use https://search.nixos.org/packages to find packages
    packages = [
        pkgs.nodejs_20
        pkgs.openssl_3_1.bin
    ];
              # Sets environment variables in the workspace
    env = {};
    idx = {
    extensions = [
        # "vscodevim.vim"
        "dbaeumer.vscode-eslint"
        "usernamehw.errorlens"
    ];
    workspace = { 
        # Runs when a workspace is first created with this `dev.nix` file
        onCreate = {
            npm-install = "npm install";
        };
                                                                    # To run something each time the environment is rebuilt, use the `onStart` hook
    };
    previews = {
        enable = true;
        previews = [
            {
                command = ["npm" "run" "start" "--" "--port" "$PORT"];
                manager = "web";
                id = "web";
            }
        ];
    };
    };
}
                                                                                                                                                        