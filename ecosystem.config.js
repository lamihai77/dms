module.exports = {
    apps: [
        {
            name: 'dms-admin',
            script: 'C:\\Proiecte\\dms\\node_modules\\next\\dist\\bin\\next',
            args: 'start -H 0.0.0.0 -p 3000',
            cwd: 'C:\\Proiecte\\dms',
            interpreter: 'node',
            watch: false,
            env: {
                NODE_ENV: 'production',
                PORT: '3000',
            },
        },
    ],
};
