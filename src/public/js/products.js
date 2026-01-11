console.log('Products page JavaScript');

$(function () {
	$('#process-btn').on('click', () => {
		$('.dish-container').slideToggle(500);
		$('#process-btn').css('display', 'none');
	});

	$('#cancel-btn').on('click', () => {
		$('.dish-container').slideToggle(300);
		$('#process-btn').css('display', 'flex');
	});
});

function validateForm() {
	const productName = $('.product-name').val();
	const productPrice = $('.product-price').val();
	const productCollection = $('.product-collection').val();
	const productDesc = $('.product-desc').val();
	const productStatus = $('.product-status').val();

	const productSize = $('.product-size').val();
	const productLeftCount = $('.product-leftcount').val();

	// Common fields
	if (
		!productName ||
		!productPrice ||
		!productCollection ||
		!productDesc ||
		!productStatus
	) {
		alert('Please fill all required fields.');
		return false;
	}

	// Coffee validation
	if (productCollection === 'COFFEE' && !productSize) {
		alert('Please select coffee size.');
		return false;
	}

	// Dessert & Salad validation
	if (
		(productCollection === 'DESSERT' || productCollection === 'SALAD') &&
		!productLeftCount
	) {
		alert('Please enter product quantity.');
		return false;
	}

	return true;
}

function previewFileHandler(input, order) {
	const imgClassName = input.className;
	console.log('input', input);

	const file = $(`.${imgClassName}`).get(0).files[0];
	const fileType = file['type'];
	const validImageType = ['image/jpg', 'image/jpeg', 'image/png'];
	if (!validImageType.includes(fileType)) {
		alert('Please insert only jpeg, jpg,or png file type');
	} else {
		if (file) {
			const reader = new FileReader();
			reader.onload = function () {
				$(`#image-section-${order}`).attr('src', reader.result);
			};
			reader.readAsDataURL(file);
		}
	}
}
