class Test {
  private title = "test_title";
  public text = "you clicked!!";
  public button = null;

  public Test(){
    button = document.querySelector('#alert');
    button.addEventListener('click', print);
  };

  public print(){
    var span = document.createElement('span');
    span.innerHTML = text;
    document.body.appendChild(span);
  };
}