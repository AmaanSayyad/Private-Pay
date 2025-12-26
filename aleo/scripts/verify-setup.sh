#!/bin/bash

# Aleo Development Environment Verification Script

echo "🔍 Verifying Aleo development environment setup..."

# Check if Leo programs exist
echo "📁 Checking Leo program structure..."
if [ -d "programs" ]; then
    echo "✅ Programs directory exists"
    
    # Check individual programs
    programs=("dark_pool" "shielded_amm")
    for program in "${programs[@]}"; do
        if [ -d "programs/$program" ]; then
            echo "✅ $program program directory exists"
            
            if [ -f "programs/$program/src/main.leo" ]; then
                echo "✅ $program/src/main.leo exists"
            else
                echo "❌ $program/src/main.leo missing"
            fi
            
            if [ -f "programs/$program/program.json" ]; then
                echo "✅ $program/program.json exists"
            else
                echo "❌ $program/program.json missing"
            fi
        else
            echo "❌ $program program directory missing"
        fi
    done
else
    echo "❌ Programs directory missing"
fi

# Check if frontend integration exists
echo "📁 Checking frontend integration..."
if [ -d "../src/lib/aleo" ]; then
    echo "✅ Frontend Aleo library exists"
    
    files=("index.js" "constants.js" "utils.js" "darkpool.js" "amm.js")
    for file in "${files[@]}"; do
        if [ -f "../src/lib/aleo/$file" ]; then
            echo "✅ $file exists"
        else
            echo "❌ $file missing"
        fi
    done
else
    echo "❌ Frontend Aleo library missing"
fi

# Check if tests exist
echo "📁 Checking test structure..."
if [ -d "../tests/aleo" ]; then
    echo "✅ Aleo tests directory exists"
    
    test_files=("darkpool.test.js" "amm.test.js" "utils.test.js")
    for file in "${test_files[@]}"; do
        if [ -f "../tests/aleo/$file" ]; then
            echo "✅ $file exists"
        else
            echo "❌ $file missing"
        fi
    done
else
    echo "❌ Aleo tests directory missing"
fi

echo "🎉 Verification complete!"
echo ""
echo "📋 Next steps:"
echo "1. Install Leo compiler: curl -L https://raw.githubusercontent.com/AleoHQ/leo/testnet/install.sh | bash"
echo "2. Build Leo programs: npm run leo:build"
echo "3. Test Leo programs: npm run leo:test"
echo "4. Run frontend tests: npm test tests/aleo"