module.exports = function(input) {
    return (Array.isArray(input) ? input.map(item => item.toLowerCase().trim()) : input.toLowerCase().trim());
};