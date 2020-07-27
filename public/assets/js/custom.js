let activeConcern;

let selectConcern = (concernName) => {
    activeConcern = concernName;
    let selectedElement = document.querySelectorAll("#fmc_concern_items .selected")[0];
    let selectedConcern = selectedElement.getAttribute("concern");
    if (selectedConcern != concernName) {
        selectedElement.classList.remove("selected");
        document.getElementById("fmc_concern_" + concernName).classList.add("selected");
        document.getElementById("fmc_result_overlay_image_" + selectedConcern).style.opacity = 0;
    }
    //document.getElementById("fmcResultImageContainer").style.backgroundImage = 'url("'+resultImages[concernName].src+'")';
    document.getElementById("fmc_result_overlay_image_" + concernName).style.opacity = 1;

    let targetProds = document.querySelectorAll('#fmc_product_container_' + concernName);

    let targetProd;

    let closestLeft = 10000;

    targetProds.forEach((prodEl) => {
        if (Math.abs(prodEl.offsetLeft) < closestLeft) {
            closestLeft = Math.abs(prodEl.offsetLeft);
            targetProd = prodEl;
        }
    })

    //let targetProd = document.getElementById('fmc_product_container_'+concernName);


    let showTargetInterval;
    clearInterval(showTargetInterval);
    let showTargetProd = () => {
        if (targetProd.offsetLeft > 0 && targetProd.offsetLeft < targetProd.offsetWidth || targetProd.getAttribute("concern") != activeConcern) {
            clearInterval(showTargetInterval);
        } else {
            if (targetProd.offsetLeft > - (targetProd.parentElement.offsetWidth) * 0.5 * window.facemap.sortedConcerns.length && targetProd.offsetLeft < 0) {
                nextProduct(false);
            } else {
                prevProduct(false);
            }
        }
    }
    showTargetProd();
    showTargetInterval = setInterval(() => {
        showTargetProd();
    }, 550);

}