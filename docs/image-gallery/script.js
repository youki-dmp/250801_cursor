document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('image-input');
    const resultArea = document.getElementById('result-area');
    const previewImage = document.getElementById('preview-image');
    const tagsOutput = document.getElementById('tags-output');
    const loadingIndicator = document.getElementById('loading-indicator');

    imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        // Reset previous results
        resultArea.classList.add('hidden');
        tagsOutput.innerHTML = '';

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            resultArea.classList.remove('hidden');
        };
        reader.readAsDataURL(file);

        // --- ここからAI連携処理を後で追加 ---
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');

        // Simulate AI processing
        setTimeout(() => {
            const dummyTags = ['風景', '空', '青', '自然', 'サンプル'];
            displayTags(dummyTags);
            loadingIndicator.classList.add('hidden');
        }, 2000);
        // --- ここまでがダミー処理 ---
    });

    function displayTags(tags) {
        tagsOutput.innerHTML = ''; // Clear previous tags
        tags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            tagElement.textContent = tag;
            tagsOutput.appendChild(tagElement);
        });
    }
});
