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

        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageData = e.target.result;
            previewImage.src = imageData;
            resultArea.classList.remove('hidden');
            loadingIndicator.classList.remove('hidden');

            try {
                const response = await fetch('/api/generate-tags', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ imageData }),
                });

                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }

                const data = await response.json();
                if (data.tags) {
                    displayTags(data.tags);
                } else {
                    throw new Error('Invalid response from API');
                }

            } catch (error) {
                console.error('Error calling API:', error);
                alert('タグの生成に失敗しました。コンソールを確認してください。');
            } finally {
                loadingIndicator.classList.add('hidden');
            }
        };
        reader.readAsDataURL(file);
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