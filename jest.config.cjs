module.exports = {
  roots:['<rootDir>'],
  testMatch:[
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
        '^.+\\.js?$': 'babel-jest',
      },
  displayName:{
    name:'jest',
    color:'blue'
  },
  collectCoverage:true,
  reporters:['default'],
  testPathIgnorePatterns:[ 
    '<rootDir>/build/',
    '<rootDir>/dist/'
  ]
}